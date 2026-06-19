package com.chat.chatBox.security;

import com.chat.chatBox.repository.AppUserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final AppUserRepository appUserRepository;

    public CustomUserDetailsService(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        return appUserRepository.findByEmail(username)
                .map(CustomUserDetails::new)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
