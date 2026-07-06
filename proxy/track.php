<?php
/**
 * Analytics tracking endpoint.
 * Receives anonymized event data and stores it in a SQLite database.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$dbFile = __DIR__ . '/analytics.db';
if (file_exists($dbFile) && !is_writable($dbFile)) {
    http_response_code(500);
    echo json_encode(['error' => 'Database is not writable']);
    exit;
}

// Connect to SQLite database (creates if not exists)
try {
    $pdo = new PDO('sqlite:' . $dbFile);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    error_log('track.php DB error: ' . $e->getMessage());
    exit;
}

// Create events table if not exists
$pdo->exec("CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT,
    event TEXT,
    timestamp INTEGER,
    version TEXT,
    properties TEXT
)");
// Create indexes for faster queries
$pdo->exec("CREATE INDEX IF NOT EXISTS idx_timestamp ON events(timestamp)");
$pdo->exec("CREATE INDEX IF NOT EXISTS idx_device ON events(device_id)");
$pdo->exec("CREATE INDEX IF NOT EXISTS idx_event ON events(event)");

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

// Validate required fields
if (!isset($input['deviceId']) || !isset($input['event']) || !isset($input['timestamp'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

// Validate and sanitize deviceId
$deviceId = trim($input['deviceId']);
if (!preg_match('/^[a-zA-Z0-9_-]{1,64}$/', $deviceId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid deviceId']);
    exit;
}

// Validate event name
$event = trim($input['event']);
if (!preg_match('/^[a-zA-Z0-9_]{1,64}$/', $event)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid event']);
    exit;
}

// Validate timestamp
$timestamp = filter_var($input['timestamp'], FILTER_VALIDATE_INT);
if ($timestamp === false || $timestamp < 0 || $timestamp > 32503680000000) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid timestamp']);
    exit;
}

// Validate version
$version = isset($input['version']) ? trim($input['version']) : '';
if (strlen($version) > 32) {
    http_response_code(400);
    echo json_encode(['error' => 'Version too long']);
    exit;
}

// Validate properties JSON
$properties = isset($input['properties']) ? $input['properties'] : [];
$propertiesJson = json_encode($properties);
if ($propertiesJson === false) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid properties']);
    exit;
}
if (strlen($propertiesJson) > 4096) {
    http_response_code(400);
    echo json_encode(['error' => 'Properties too large']);
    exit;
}

// Insert event into database
try {
    $stmt = $pdo->prepare("INSERT INTO events (device_id, event, timestamp, version, properties) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$deviceId, $event, $timestamp, $version, $propertiesJson]);
    http_response_code(200);
    echo json_encode(['status' => 'ok']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
    error_log('track.php insert error: ' . $e->getMessage());
    exit;
}