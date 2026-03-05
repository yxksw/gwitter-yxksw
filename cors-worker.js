// Cloudflare Worker for Gwitter OAuth
// 部署地址: https://gwitter-api.261770.xyz

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    // 处理 OAuth 回调 - 当访问根路径或带有 code 参数时
    const code = url.searchParams.get('code');
    if (code) {
      // 这是 GitHub OAuth 回调，返回 HTML 页面通过 postMessage 发送 token
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>GitHub OAuth Callback</title>
</head>
<body>
  <script>
    (function() {
      // 获取 URL 中的 code
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code) {
        // 通过 postMessage 发送给父窗口
        window.opener && window.opener.postMessage(
          JSON.stringify({ result: 'access_token=' + code, error: null }),
          '*'
        );
        document.body.innerHTML = '<h2>授权成功，请关闭此窗口</h2>';
      } else {
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        window.opener && window.opener.postMessage(
          JSON.stringify({ result: null, error: errorDescription || error || 'Unknown error' }),
          '*'
        );
        document.body.innerHTML = '<h2>授权失败: ' + (errorDescription || error) + '</h2>';
      }
      
      // 关闭窗口
      setTimeout(() => window.close(), 1000);
    })();
  </script>
</body>
</html>`;
      return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // 处理代理请求 - 用于获取 access_token
    // 如果没有 url 参数，默认转发到 GitHub OAuth access_token 端点
    let finalTargetUrl = targetUrl;
    if (!finalTargetUrl && request.method === 'POST') {
      finalTargetUrl = 'https://github.com/login/oauth/access_token';
    }

    if (!finalTargetUrl) {
      return new Response('Missing url parameter or invalid request', {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'text/plain'
        }
      });
    }

    try {
      // 克隆请求并修改 headers
      const modifiedRequest = new Request(finalTargetUrl, {
        method: request.method,
        headers: {
          ...Object.fromEntries(request.headers),
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: request.body
      });

      const response = await fetch(modifiedRequest);

      // 读取响应内容
      const responseBody = await response.text();

      // 返回响应，添加 CORS 头
      return new Response(responseBody, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
