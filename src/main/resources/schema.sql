CREATE TABLE IF NOT EXISTS users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    username VARCHAR(80) NOT NULL,
    email VARCHAR(120) NOT NULL,
    password VARCHAR(255) NOT NULL,
    profile_image VARCHAR(512),
    online_status BIT(1) NOT NULL DEFAULT 0,
    last_seen TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    blocked BIT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_username (username),
    UNIQUE KEY uk_users_email (email)
);

CREATE TABLE IF NOT EXISTS conversations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    conversation_key VARCHAR(128) NOT NULL,
    type VARCHAR(20) NOT NULL,
    name VARCHAR(120),
    avatar_url VARCHAR(512),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_conversations_key (conversation_key)
);

CREATE TABLE IF NOT EXISTS conversation_participants (
    id BIGINT NOT NULL AUTO_INCREMENT,
    conversation_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP NULL,
    muted BIT(1) NOT NULL DEFAULT 0,
    archived BIT(1) NOT NULL DEFAULT 0,
    pinned BIT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_participants_conversation (conversation_id),
    KEY idx_participants_user (user_id),
    CONSTRAINT fk_participants_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    CONSTRAINT fk_participants_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
    id BIGINT NOT NULL AUTO_INCREMENT,
    conversation_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    receiver_id BIGINT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL,
    file_url VARCHAR(512),
    status VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    read_at TIMESTAMP NULL,
    deleted BIT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_messages_conversation (conversation_id),
    KEY idx_messages_sender (sender_id),
    KEY idx_messages_receiver (receiver_id),
    CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id),
    CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users(id)
);
