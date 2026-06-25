# Chat Application using Spring Boot and WebSockets

A real-time chat application built with **Spring Boot**, **WebSocket**, **STOMP**, **SockJS**, and **Bootstrap** that enables instant messaging between users without page refresh.

## 🚀 Features

* Real-time messaging using WebSockets
* STOMP messaging protocol support
* SockJS fallback for browser compatibility
* User join/leave notifications
* Responsive chat interface
* Live message broadcasting
* Lightweight and easy to deploy
* Spring Boot backend with embedded server

## 🛠️ Tech Stack

### Backend

* Java 21
* Spring Boot
* Spring WebSocket
* STOMP
* SockJS
* Maven
* Lombok

### Frontend

* HTML5
* CSS3
* JavaScript
* Bootstrap 5

## 📂 Project Structure

```text
src
├── main
│   ├── java
│   │   └── com.chatapp
│   │       ├── controller
│   │       ├── model
│   │       ├── config
│   │       └── ChatApplication.java
│   └── resources
│       ├── static
│       ├── templates
│       └── application.properties
```

## ⚙️ How It Works

1. Users enter their username and join the chat room.
2. A WebSocket connection is established between client and server.
3. Messages are sent using STOMP messaging.
4. Spring Boot broadcasts messages to all connected clients.
5. Users receive messages instantly without refreshing the page.

## 🔄 WebSocket Flow

```text
Client
   │
   ▼
SockJS Connection
   │
   ▼
STOMP Messaging
   │
   ▼
Spring Boot WebSocket Server
   │
   ▼
Broadcast Message
   │
   ▼
Connected Users
```

## 📦 Installation

### Clone Repository

```bash
git clone https://github.com/sarthak425/chat-Application-using-Spring-Boot-and-WebSockets.git
```

### Navigate to Project

```bash
cd chat-Application-using-Spring-Boot-and-WebSockets
```

### Build Project

```bash
mvn clean install
```

### Run Application

```bash
mvn spring-boot:run
```

Or run:

```bash
ChatApplication.java
```

## 🌐 Access Application

Open browser:

```text
http://localhost:8081
```

(Use your configured server port if different.)

## 📸 Application Features

* Join Chat Room
* Send Messages
* Receive Messages Instantly
* User Notifications
* Real-Time Communication

## 🎯 Learning Objectives

This project demonstrates:

* WebSocket Communication
* Real-Time Application Development
* Spring Boot WebSocket Configuration
* STOMP Protocol Integration
* Client-Server Messaging Architecture
* Event-Driven Communication

## 🔮 Future Enhancements

* Private Messaging
* User Authentication (JWT)
* Online/Offline Status
* Chat History Storage
* File Sharing
* Emoji Support
* Voice Messages
* Group Chats
* Video Calling
* WhatsApp-style UI

## 👨‍💻 Author

**Sarthak Khatpe**

GitHub: https://github.com/sarthak425

---

⭐ If you found this project useful, consider giving it a star on GitHub.
