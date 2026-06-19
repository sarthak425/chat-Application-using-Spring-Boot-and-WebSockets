package com.chat.chatBox.security;

import java.util.Objects;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

@Component
public class JwtStompChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    public JwtStompChannelInterceptor(JwtService jwtService, UserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        // Authenticate connection on CONNECT command
        if (accessor.getCommand() == StompCommand.CONNECT) {
            String authHeader = Objects.toString(accessor.getFirstNativeHeader("Authorization"), "");
            if (!authHeader.isBlank()) {
                try {
                    String token = jwtService.stripBearer(authHeader);
                    String email = jwtService.extractEmail(token);
                    if (email != null) {
                        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                        if (jwtService.isTokenValid(token, userDetails.getUsername())) {
                            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities());
                            accessor.setUser(authentication);
                        }
                    }
                } catch (Exception ignored) {
                }
            }
        }

        // Propagate user authentication to SecurityContextHolder for all commands
        if (accessor.getUser() instanceof Authentication authentication) {
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        return message;
    }

    @Override
    public void afterSendCompletion(Message<?> message, MessageChannel channel, boolean sent, Exception ex) {
        // Clear security context after processing to prevent thread-local leakage
        SecurityContextHolder.clearContext();
    }
}
