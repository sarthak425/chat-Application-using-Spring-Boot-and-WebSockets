package com.chat.chatBox.controller;

import com.chat.chatBox.dto.ChatDtos;
import com.chat.chatBox.service.FileStorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileStorageService fileStorageService;

    public FileController(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    @PostMapping("/upload")
    public ResponseEntity<ChatDtos.UploadResponse> upload(@RequestPart("file") MultipartFile file) {
        FileStorageService.StoredFile stored = fileStorageService.save(file);
        return ResponseEntity.ok(new ChatDtos.UploadResponse(stored.url(), stored.originalName(), stored.contentType()));
    }
}
