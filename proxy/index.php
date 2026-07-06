<?php
/**
 * Proxy endpoint for AI API calls and balance checks.
 * Forwards requests to DeepSeek API and returns the response.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

// Balance request
if ($action === 'balance') {
    $apiKey = $input['apiKey'] ?? '';
    if (empty($apiKey)) {
        http_response_code(400);
        echo json_encode(['error' => 'API key required']);
        exit;
    }
    
    $ch = curl_init('https://api.deepseek.com/user/balance');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/json',
        'Authorization: Bearer ' . $apiKey
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($curlError) {
        http_response_code(500);
        echo json_encode(['error' => 'CURL error: ' . $curlError]);
        exit;
    }
    
    http_response_code($httpCode);
    echo $response;
    exit;
}

// Chat completions request
if (!isset($input['apiKey']) || !isset($input['messages'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing apiKey or messages']);
    exit;
}

$apiKey = $input['apiKey'];
$messages = $input['messages'];

if (!is_array($messages) || empty($messages)) {
    http_response_code(400);
    echo json_encode(['error' => 'Messages must be a non-empty array']);
    exit;
}

$url = 'https://api.deepseek.com/v1/chat/completions';
$payload = [
    'model' => 'deepseek-v4-flash',
    'messages' => $messages,
    'stream' => false
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $apiKey
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(['error' => 'CURL error: ' . $curlError]);
    exit;
}

if ($httpCode !== 200) {
    $decoded = json_decode($response, true);
    $errorMsg = isset($decoded['error']['message']) ? $decoded['error']['message'] : 'Unknown API error';
    http_response_code($httpCode);
    echo json_encode(['error' => $errorMsg]);
    exit;
}

echo $response;