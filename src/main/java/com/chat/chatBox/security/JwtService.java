package com.chat.chatBox.security;

import com.chat.chatBox.entity.AppUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.signingKey = Keys.hmacShaKeyFor(normalizeSecret(secret));
        this.expirationMs = expirationMs;
    }

    public String generateToken(AppUser user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("uid", user.getId());
        claims.put("username", user.getUsername());

        return Jwts.builder()
                .claims(claims)
                .subject(user.getEmail())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractEmail(String token) {
        return extractAllClaims(token).getSubject();
    }

    public boolean isTokenValid(String token, String email) {
        return extractEmail(token).equals(email) && !extractAllClaims(token).getExpiration().before(new Date());
    }

    public Long extractUserId(String token) {
        Object value = extractAllClaims(token).get("uid");
        if (value instanceof Number number) {
            return number.longValue();
        }

        return Long.valueOf(String.valueOf(value));
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String stripBearer(String value) {
        if (value == null) {
            return "";
        }

        return value.startsWith("Bearer ") ? value.substring(7) : value;
    }

    private byte[] normalizeSecret(String secret) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length >= 64) {
            return bytes;
        }

        byte[] padded = new byte[64];
        System.arraycopy(bytes, 0, padded, 0, bytes.length);
        return padded;
    }
}
