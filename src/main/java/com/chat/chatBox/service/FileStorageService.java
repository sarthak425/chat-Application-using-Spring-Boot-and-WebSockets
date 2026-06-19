package com.chat.chatBox.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {

    private final Path rootDir;

    public FileStorageService(@Value("${app.upload.dir}") String uploadDir) {
        this.rootDir = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public StoredFile save(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        try {
            Files.createDirectories(rootDir);
            String originalName = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
            String safeName = UUID.randomUUID() + "-" + originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
            Path target = rootDir.resolve(safeName);
            Files.copy(file.getInputStream(), target);

            return new StoredFile("/uploads/" + safeName, originalName, file.getContentType());
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to store file", ex);
        }
    }

    public record StoredFile(String url, String originalName, String contentType) {
    }
}
