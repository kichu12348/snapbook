import axios from "axios";

export const uploadImage = async (imageUri) => {
  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    type: "image/jpeg",
    name: "photo.jpg",
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
