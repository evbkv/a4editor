<?php
/**
 * Admin dashboard for A4 Editor analytics.
 * Provides aggregated statistics (DAU, MAU, events, versions) with session authentication.
 */

session_start();

// Handle logout
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?'));
    exit;
}

// Admin password (plaintext, hashed on each request – can be replaced with static hash)
$ADMIN_PASSWORD = 'a4admin';
$ADMIN_PASSWORD_HASH = password_hash($ADMIN_PASSWORD, PASSWORD_DEFAULT);

/**
 * Validate a date string in YYYY-MM-DD format.
 * @param string $date
 * @return int|false Unix timestamp or false if invalid
 */
function validateDate($date) {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        return false;
    }
    $timestamp = strtotime($date);
    if ($timestamp === false) {
        return false;
    }
    $year = date('Y', $timestamp);
    if ($year < 2000 || $year > 2100) {
        return false;
    }
    return $timestamp;
}

/**
 * Determine start and end timestamps based on period and custom parameters.
 * @param string $period 'today', 'week', 'month', 'custom'
 * @param string $startParam
 * @param string $endParam
 * @return array [start, end] Unix timestamps
 */
function getStartEnd($period, $startParam, $endParam) {
    $today = strtotime('today');
    $now = time();
    if ($period === 'today') {
        return [$today, strtotime('tomorrow') - 1];
    } elseif ($period === 'week') {
        return [strtotime('-7 days'), $now];
    } elseif ($period === 'month') {
        return [strtotime('-30 days'), $now];
    } elseif ($period === 'custom') {
        $start = validateDate($startParam);
        $end = validateDate($endParam);
        if (!$start || !$end) {
            return [$today, $now];
        }
        if ($start > $end) {
            return [$end, $start];
        }
        if ($end - $start > 365 * 86400) {
            $end = $start + 365 * 86400;
        }
        return [$start, $end];
    }
    return [$today, $now];
}

/**
 * Get total number of events in a time range.
 * @param PDO $pdo
 * @param int $start
 * @param int $end
 * @return int
 */
function getTotalEvents($pdo, $start, $end) {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM events WHERE timestamp >= ? AND timestamp <= ?");
    $stmt->execute([$start * 1000, $end * 1000]);
    return $stmt->fetchColumn();
}

/**
 * Get daily active users (unique devices) for a time range.
 * @param PDO $pdo
 * @param int $start
 * @param int $end
 * @return int
 */
function getDAU($pdo, $start, $end) {
    $stmt = $pdo->prepare("SELECT COUNT(DISTINCT device_id) FROM events WHERE timestamp >= ? AND timestamp <= ?");
    $stmt->execute([$start * 1000, $end * 1000]);
    return $stmt->fetchColumn();
}

/**
 * Get monthly active users (unique devices over last 30 days).
 * @param PDO $pdo
 * @return int
 */
function getMAU($pdo) {
    $mauStart = strtotime('-30 days');
    $stmt = $pdo->prepare("SELECT COUNT(DISTINCT device_id) FROM events WHERE timestamp >= ?");
    $stmt->execute([$mauStart * 1000]);
    return $stmt->fetchColumn();
}

/**
 * Get total unique devices (all time).
 * @param PDO $pdo
 * @return int
 */
function getUniqueDevices($pdo) {
    $stmt = $pdo->prepare("SELECT COUNT(DISTINCT device_id) FROM events");
    $stmt->execute();
    return $stmt->fetchColumn();
}

/**
 * Get event distribution (event type counts) for a time range.
 * @param PDO $pdo
 * @param int $start
 * @param int $end
 * @return array
 */
function getEventDistribution($pdo, $start, $end) {
    $stmt = $pdo->prepare("SELECT event, COUNT(*) as cnt FROM events WHERE timestamp >= ? AND timestamp <= ? GROUP BY event");
    $stmt->execute([$start * 1000, $end * 1000]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Get top 10 app versions by usage for a time range.
 * @param PDO $pdo
 * @param int $start
 * @param int $end
 * @return array
 */
function getTopVersions($pdo, $start, $end) {
    $stmt = $pdo->prepare("SELECT version, COUNT(*) as cnt FROM events WHERE timestamp >= ? AND timestamp <= ? AND version != '' GROUP BY version ORDER BY cnt DESC LIMIT 10");
    $stmt->execute([$start * 1000, $end * 1000]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Generate or retrieve CSRF token from session.
 * @return string
 */
function generateCSRFToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Verify CSRF token.
 * @param string $token
 * @return bool
 */
function verifyCSRFToken($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

// Initialize login attempt tracking
if (!isset($_SESSION['login_attempts'])) {
    $_SESSION['login_attempts'] = 0;
    $_SESSION['login_first_attempt'] = time();
}

/**
 * Check if login is blocked due to too many failed attempts.
 * @return bool
 */
function isLoginBlocked() {
    $attempts = $_SESSION['login_attempts'] ?? 0;
    $first = $_SESSION['login_first_attempt'] ?? time();
    if ($attempts >= 5 && (time() - $first) < 900) {
        return true;
    }
    if (time() - $first >= 900) {
        $_SESSION['login_attempts'] = 0;
        $_SESSION['login_first_attempt'] = time();
        return false;
    }
    return false;
}

// Authentication check
if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
        if (isLoginBlocked()) {
            http_response_code(429);
            echo 'Too many login attempts. Please try again later.';
            exit;
        }
        $password = $_POST['password'] ?? '';
        if (password_verify($password, $ADMIN_PASSWORD_HASH)) {
            $_SESSION['authenticated'] = true;
            $_SESSION['login_attempts'] = 0;
            $_SESSION['login_first_attempt'] = time();
            header('Location: ' . $_SERVER['PHP_SELF']);
            exit;
        } else {
            $_SESSION['login_attempts']++;
            $error = 'Invalid password.';
        }
    }
    // Show login form
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>A4 Editor Analytics - Login</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body>
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-4">
                    <h3 class="text-center">A4 Editor Analytics</h3>
                    <form method="POST" class="mt-4">
                        <input type="hidden" name="csrf_token" value="<?= generateCSRFToken() ?>">
                        <div class="mb-3">
                            <label for="password" class="form-label">Password</label>
                            <input type="password" name="password" id="password" class="form-control" required>
                        </div>
                        <?php if (isset($error)): ?>
                            <div class="alert alert-danger"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
                        <?php endif; ?>
                        <button type="submit" class="btn btn-primary w-100">Login</button>
                    </form>
                </div>
            </div>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// CSRF protection for POST requests
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['csrf_token'])) {
    if (!verifyCSRFToken($_POST['csrf_token'])) {
        http_response_code(403);
        echo 'Invalid CSRF token.';
        exit;
    }
}

// --- Database connection with auto-creation ---
$dbFile = __DIR__ . '/../proxy/analytics.db';

// Create the database file if it doesn't exist
if (!file_exists($dbFile)) {
    touch($dbFile);
}

try {
    $pdo = new PDO('sqlite:' . $dbFile);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // Create the events table if it doesn't exist
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
} catch (PDOException $e) {
    error_log('DB connection error: ' . $e->getMessage());
    die('Database error. Please try again later.');
}
// --- End of database connection block ---

// Get period and date parameters
$period = $_GET['period'] ?? 'today';
$startParam = $_GET['start'] ?? '';
$endParam = $_GET['end'] ?? '';
list($start, $end) = getStartEnd($period, $startParam, $endParam);

// Fetch metrics
$totalEvents = getTotalEvents($pdo, $start, $end);
$dau = getDAU($pdo, $start, $end);
$mau = getMAU($pdo);
$uniqueDevices = getUniqueDevices($pdo);
$eventDistribution = getEventDistribution($pdo, $start, $end);
$topVersions = getTopVersions($pdo, $start, $end);

/**
 * Helper function to escape HTML output.
 * @param string $str
 * @return string
 */
function e($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>A4 Editor Analytics</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { padding-top: 20px; }
        .card { margin-bottom: 20px; }
    </style>
</head>
<body>
<div class="container">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h1>A4 Editor Analytics</h1>
        <a href="?logout=1" class="btn btn-outline-danger">Logout</a>
    </div>
    <form method="GET" class="row g-3 mb-4">
        <input type="hidden" name="csrf_token" value="<?= generateCSRFToken() ?>">
        <div class="col-auto">
            <label class="form-label">Period</label>
            <select name="period" class="form-select" onchange="this.form.submit()">
                <option value="today" <?= $period=='today'?'selected':'' ?>>Today</option>
                <option value="week" <?= $period=='week'?'selected':'' ?>>Week</option>
                <option value="month" <?= $period=='month'?'selected':'' ?>>Month</option>
                <option value="custom" <?= $period=='custom'?'selected':'' ?>>Custom</option>
            </select>
        </div>
        <?php if ($period == 'custom'): ?>
        <div class="col-auto">
            <label class="form-label">Start</label>
            <input type="date" name="start" class="form-control" value="<?= e(date('Y-m-d', $start)) ?>">
        </div>
        <div class="col-auto">
            <label class="form-label">End</label>
            <input type="date" name="end" class="form-control" value="<?= e(date('Y-m-d', $end)) ?>">
        </div>
        <div class="col-auto">
            <label class="form-label" style="visibility:hidden;">Apply</label>
            <button type="submit" class="btn btn-primary d-block">Apply</button>
        </div>
        <?php endif; ?>
    </form>

    <!-- Metrics cards -->
    <div class="row">
        <div class="col-md-3">
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Total Events</h5>
                    <p class="card-text display-6"><?= e($totalEvents) ?></p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">DAU</h5>
                    <p class="card-text display-6"><?= e($dau) ?></p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">MAU</h5>
                    <p class="card-text display-6"><?= e($mau) ?></p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Unique Devices</h5>
                    <p class="card-text display-6"><?= e($uniqueDevices) ?></p>
                </div>
            </div>
        </div>
    </div>

    <div class="row">
        <div class="col-md-6">
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Top Versions</h5>
                    <ul class="list-group">
                        <?php foreach ($topVersions as $v): ?>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <?= e($v['version']) ?>
                            <span class="badge bg-primary rounded-pill"><?= e($v['cnt']) ?></span>
                        </li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            </div>
        </div>
        <div class="col-md-6">
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Event Types</h5>
                    <ul class="list-group">
                        <?php foreach ($eventDistribution as $e): ?>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <?= e($e['event']) ?>
                            <span class="badge bg-secondary rounded-pill"><?= e($e['cnt']) ?></span>
                        </li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</div>
</body>
</html>