<?php

// Stable router for PHP's built-in development server on Windows.
$publicPath = __DIR__.'/public';
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');

if ($uri !== '/' && is_file($publicPath.$uri)) {
    return false;
}

require $publicPath.'/index.php';
