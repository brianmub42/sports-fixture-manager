-- Multi-Tenant Database Schema

CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    event_title VARCHAR(150) DEFAULT 'Championship',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS districts (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#2563eb',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS sports (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    scoring_type VARCHAR(20) DEFAULT 'points',
    win_points INT DEFAULT 3,
    draw_points INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS venues (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(20) DEFAULT 'court',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS fixtures (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    sport_id INT REFERENCES sports(id) ON DELETE CASCADE,
    venue_id INT REFERENCES venues(id) ON DELETE CASCADE,
    round VARCHAR(50),
    team_a_id INT REFERENCES districts(id) ON DELETE CASCADE,
    team_b_id INT REFERENCES districts(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP,
    duration_minutes INT DEFAULT 10,
    score_a INT,
    score_b INT,
    status VARCHAR(20) DEFAULT 'upcoming',
    winner_id INT REFERENCES districts(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS athletics_events (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    category VARCHAR(20),
    scheduled_at TIMESTAMP,
    duration_minutes INT DEFAULT 4,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS athletics_results (
    id SERIAL PRIMARY KEY,
    event_id INT REFERENCES athletics_events(id) ON DELETE CASCADE,
    district_id INT REFERENCES districts(id) ON DELETE CASCADE,
    placement INT,
    points INT,
    time_ms INT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'viewer',
    district_id INT REFERENCES districts(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS score_logs (
    id SERIAL PRIMARY KEY,
    fixture_id INT REFERENCES fixtures(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    old_score_a INT,
    old_score_b INT,
    new_score_a INT,
    new_score_b INT,
    changed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    key VARCHAR(50) NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (organization_id, key)
);
