// MongoDB Replica Set Initialization Script
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb-primary:27017", priority: 2 },
    { _id: 1, host: "mongodb-secondary1:27017", priority: 1 },
    { _id: 2, host: "mongodb-secondary2:27017", priority: 1 }
  ]
});

// Wait for replica set to be ready
sleep(5000);

// Create application databases
use('educational_platform');

// Create collections with validation
db.createCollection("content", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "type", "authorId", "createdAt"],
      properties: {
        title: { bsonType: "string" },
        type: { bsonType: "string", enum: ["lesson", "exercise", "media", "assessment"] },
        authorId: { bsonType: "string" },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});

db.createCollection("conversations", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "sessionId", "createdAt"],
      properties: {
        userId: { bsonType: "string" },
        sessionId: { bsonType: "string" },
        messages: { bsonType: "array" },
        createdAt: { bsonType: "date" }
      }
    }
  }
});

db.createCollection("collaboration_documents", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "ownerId", "createdAt"],
      properties: {
        title: { bsonType: "string" },
        ownerId: { bsonType: "string" },
        collaborators: { bsonType: "array" },
        content: { bsonType: "object" },
        createdAt: { bsonType: "date" }
      }
    }
  }
});

// Create indexes for performance
db.content.createIndex({ "authorId": 1 });
db.content.createIndex({ "type": 1 });
db.content.createIndex({ "createdAt": -1 });
db.content.createIndex({ "tags": 1 });
db.content.createIndex({ "title": "text", "description": "text" });

db.conversations.createIndex({ "userId": 1 });
db.conversations.createIndex({ "sessionId": 1 });
db.conversations.createIndex({ "createdAt": -1 });

db.collaboration_documents.createIndex({ "ownerId": 1 });
db.collaboration_documents.createIndex({ "collaborators": 1 });
db.collaboration_documents.createIndex({ "createdAt": -1 });

// Create application user
db.createUser({
  user: "app_user",
  pwd: "app_password",
  roles: [
    { role: "readWrite", db: "educational_platform" }
  ]
});

print("MongoDB replica set and database initialization completed");