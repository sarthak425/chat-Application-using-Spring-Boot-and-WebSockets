package com.chat.chatBox.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String username;

    @Column(nullable = false, unique = true, length = 120)
    private String email;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(length = 512)
    private String profileImage;

    @Column(nullable = false)
    private boolean onlineStatus;

    private Instant lastSeen;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private boolean blocked;

    public void markOnline() {
        this.onlineStatus = true;
    }

    public void markOffline() {
        this.onlineStatus = false;
        this.lastSeen = Instant.now();
    }
}
