import axios from "axios";


const mimeTypes = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".webp": "image/webp",
  ".tiff": "image/tiff",
  ".svg": "image/svg+xml",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".raw": "image/raw",
  ".ico": "image/x-icon",
  ".jfif": "image/jpeg",
  ".avif": "image/avif",
  ".ind": "image/ind",
  ".indd": "image/indd",
  ".indesign": "image/indesign",
  ".eps": "image/eps",
  ".pdf": "application/pdf",
  ".ai": "application/postscript",
  ".eps": "application/postscript",
};

export const uploadImage = async (imageUri) => {
  if (!imageUri) return null;
  const fileExtension = imageUri.split(".").pop();
  const mimeType = mimeTypes[`.${fileExtension}`] || "application/octet-stream";
  const fileName = imageUri.split("/").pop();
  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    type: mimeType,
    name: fileName,
  });

  try {
    const { data } = await axios.post("/api/file/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data.uri;
  } catch (error) {
    throw error;
  }
};

export const deleteImage = async (uri) => {
  try {
    const { data } = await axios.post("/api/file/delete", { uri });
    return data;
  } catch (error) {
    throw error;
  }
}
