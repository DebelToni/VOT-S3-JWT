
# File Management Site VOT project

### Example of getting a token:
```
curl -X POST \
  http://localhost:8080/realms/file-sharing-site/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=file-management-client" \
  -d "username=gosho" \
  -d "password=123"
```

### Example of uploading file after getting a token:
```
curl -X POST \
  "http://localhost:3000/upload?name=test.txt" \
  -H "Authorization: Bearer <access_token> " \
  -H "Content-Type: application/json" \
  -d '{"file": "SGVsbG8sIFdvcmxkIQ=="}'
```

### Example of downloading file after getting a token:
```
curl -X GET \
  "http://localhost:3000/files" \
  -H "Authorization: Bearer <access_token>"
```

### Example of dowloading a file:
```
curl -X GET \
  "http://localhost:3000/download/test.txt" \
  -H "Authorization: Bearer <access_token>" \
  --output downloaded.txt
```
