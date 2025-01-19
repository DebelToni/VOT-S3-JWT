const KEYCLOAK_URL = "http://localhost:8080";
const REALM = "file-sharing-site";
const CLIENT_ID = "file-management-client";

let accessToken = null;

const loginSection = document.getElementById("login-section");
const fileSection = document.getElementById("file-section");
const loginMsg = document.getElementById("login-msg");
const operationMsg = document.getElementById("operation-msg");
const previewArea = document.getElementById("preview-area");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");

const listBtn = document.getElementById("list-btn");
const fileList = document.getElementById("file-list");

const uploadBtn = document.getElementById("upload-btn");
const uploadFilename = document.getElementById("upload-filename");
const uploadFileInput = document.getElementById("upload-file");
const uploadFileContent = document.getElementById("upload-file-content");

const downloadBtn = document.getElementById("download-btn");
const downloadFilename = document.getElementById("download-filename");

const updateBtn = document.getElementById("update-btn");
const updateFilename = document.getElementById("update-filename");
const updateFileContent = document.getElementById("update-file-content");

const deleteBtn = document.getElementById("delete-btn");
const deleteFilename = document.getElementById("delete-filename");

loginBtn.addEventListener("click", async () => {
	const username = usernameInput.value.trim();
	const password = passwordInput.value.trim();

	if (!username || !password) {
		loginMsg.innerText = "Please enter username and password.";
		return;
	}

	loginMsg.innerText = "Logging in...";

	try {
		const tokenUrl = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`;

		const params = new URLSearchParams();
		params.append("grant_type", "password");
		params.append("client_id", CLIENT_ID);

		params.append("username", username);
		params.append("password", password);

		const response = await fetch(tokenUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: params.toString(),
		});

		if (!response.ok) {
			const errorData = await response.json();
			loginMsg.innerText =
				"Login failed: " + (errorData.error_description || "Unknown error");
			return;
		}

		const data = await response.json();
		accessToken = data.access_token;
		loginMsg.innerText = "Login successful!";

		loginSection.classList.add("hidden");
		fileSection.classList.remove("hidden");
	} catch (err) {
		console.error(err);
		loginMsg.innerText = "Error during login.";
	}
});

function getAuthHeaders() {
	return {
		"Content-Type": "application/json",
		Authorization: "Bearer " + accessToken,
	};
}

listBtn.addEventListener("click", async () => {
	operationMsg.innerText = "";
	fileList.innerHTML = "";
	previewArea.innerHTML = "<em>File preview will appear here</em>";

	try {
		const resp = await fetch("/files", {
			method: "GET",
			headers: getAuthHeaders(),
		});
		if (!resp.ok) {
			operationMsg.innerText = "Error listing files.";
			return;
		}
		const data = await resp.json();

		data.files.forEach((fileName) => {
			const li = document.createElement("li");
			li.className = "file-item";

			const span = document.createElement("span");
			span.textContent = fileName;

			const previewButton = document.createElement("button");
			previewButton.textContent = "Preview";
			previewButton.addEventListener("click", () => {
				previewFile(fileName);
			});

			li.appendChild(span);
			li.appendChild(previewButton);
			fileList.appendChild(li);
		});
	} catch (err) {
		console.error(err);
		operationMsg.innerText = "Error listing files.";
	}
});

async function previewFile(fileName) {
	try {
		const resp = await fetch(`/download/${encodeURIComponent(fileName)}`, {
			headers: {
				Authorization: "Bearer " + accessToken,
			},
		});
		if (!resp.ok) {
			previewArea.textContent = "Unable to preview file.";
			return;
		}
		const blob = await resp.blob();

		const fileExtension = fileName.split(".").pop().toLowerCase();
		if (["png", "jpg", "jpeg", "gif"].includes(fileExtension)) {
			const url = URL.createObjectURL(blob);
			previewArea.innerHTML = "";
			const img = document.createElement("img");
			img.className = "preview-image";
			img.src = url;
			previewArea.appendChild(img);
		} else {
			const text = await blob.text();
			previewArea.textContent = text;
		}
	} catch (err) {
		console.error(err);
		previewArea.textContent = "Error previewing file.";
	}
}

uploadBtn.addEventListener("click", async () => {
	const fileName = uploadFilename.value.trim();
	if (!fileName) {
		operationMsg.innerText = "Provide a filename.";
		return;
	}

	operationMsg.innerText = "Uploading...";

	try {
		let fileDataBase64 = "";

		if (uploadFileInput.files && uploadFileInput.files.length > 0) {
			fileDataBase64 = await convertFileToBase64(uploadFileInput.files[0]);
		} else {
			const textContent = uploadFileContent.value;
			fileDataBase64 = btoa(textContent);
		}

		const resp = await fetch(`/upload?name=${encodeURIComponent(fileName)}`, {
			method: "POST",
			headers: getAuthHeaders(),
			body: JSON.stringify({ file: fileDataBase64 }),
		});
		const data = await resp.json();
		if (!resp.ok) {
			operationMsg.innerText = "Upload failed: " + data.error;
			return;
		}
		operationMsg.innerText = data.message;
	} catch (err) {
		console.error(err);
		operationMsg.innerText = "Error uploading file.";
	}
});

function convertFileToBase64(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const base64 = reader.result.split(",")[1];
			resolve(base64);
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

downloadBtn.addEventListener("click", async () => {
	const fileName = downloadFilename.value.trim();
	if (!fileName) {
		operationMsg.innerText = "Specify file name to download.";
		return;
	}

	operationMsg.innerText = "Downloading...";

	try {
		const resp = await fetch(`/download/${encodeURIComponent(fileName)}`, {
			method: "GET",
			headers: {
				Authorization: "Bearer " + accessToken,
			},
		});

		if (!resp.ok) {
			operationMsg.innerText = "File download failed.";
			return;
		}

		const blob = await resp.blob();
		const url = URL.createObjectURL(blob);

		const link = document.createElement("a");
		link.href = url;
		link.download = fileName;
		link.click();

		URL.revokeObjectURL(url);
		operationMsg.innerText = `File '${fileName}' downloaded.`;
	} catch (err) {
		console.error(err);
		operationMsg.innerText = "Error downloading file.";
	}
});

updateBtn.addEventListener("click", async () => {
	const fileName = updateFilename.value.trim();
	const newContent = updateFileContent.value;
	if (!fileName || !newContent) {
		operationMsg.innerText = "Specify file name and new content.";
		return;
	}

	try {
		const base64Data = btoa(newContent);
		const resp = await fetch(`/update/${encodeURIComponent(fileName)}`, {
			method: "PUT",
			headers: getAuthHeaders(),
			body: JSON.stringify({ file: base64Data }),
		});
		const data = await resp.json();
		if (!resp.ok) {
			operationMsg.innerText = "Update failed: " + data.error;
			return;
		}
		operationMsg.innerText = data.message;
	} catch (err) {
		console.error(err);
		operationMsg.innerText = "Error updating file.";
	}
});

deleteBtn.addEventListener("click", async () => {
	const fileName = deleteFilename.value.trim();
	if (!fileName) {
		operationMsg.innerText = "Specify file name to delete.";
		return;
	}

	try {
		const resp = await fetch(`/delete/${encodeURIComponent(fileName)}`, {
			method: "DELETE",
			headers: getAuthHeaders(),
		});
		const data = await resp.json();
		if (!resp.ok) {
			operationMsg.innerText = "Delete failed: " + data.error;
			return;
		}
		operationMsg.innerText = data.message;
	} catch (err) {
		console.error(err);
		operationMsg.innerText = "Error deleting file.";
	}
});
