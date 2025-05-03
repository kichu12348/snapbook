import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { Alert } from "react-native";

async function checkFileExists(fileUri) {
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  return fileInfo.exists;
}

async function downloadFile(url, filename, cb = () => {}) {
  const fileUri = `${FileSystem.documentDirectory}${filename}`;

  const fileExists = await checkFileExists(fileUri);
  if (fileExists) {
    cb(100); // Call the callback with 100% progress if the file already exists
    return fileUri; // Return the existing file URI if it exists
  }

  const callBack = (progress) => {
    const progressPercentage =
      (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100;
    cb(progressPercentage);
  };
  const downloadResumable = FileSystem.createDownloadResumable(
    url,
    fileUri,
    {},
    callBack
  );

  try {
    const { uri } = await downloadResumable.downloadAsync();
    cb(100); // Call the callback with 100% progress when done
    return uri;
  } catch (e) {
    console.log("Error downloading file:", e.message);
    return null;
  }
}

async function deleteFile(fileUri) {
  try {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
  } catch (error) {
    console.error("Error deleting file:", error);
  }
}

export async function saveToGallery(oUri, cb = () => {}) {
  const fileName = oUri.split("/").pop();
  const uri = await downloadFile(oUri, fileName, cb);
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status === "granted") {
    const asset = await MediaLibrary.createAssetAsync(uri);
    const checkIfAlbumExists = await MediaLibrary.getAlbumAsync("snapbook");
    if (checkIfAlbumExists) {
      await MediaLibrary.addAssetsToAlbumAsync(
        [asset],
        checkIfAlbumExists.id,
        false
      );
    } else {
      await MediaLibrary.createAlbumAsync("snapbook", asset, false);
    }
    await deleteFile(uri); // Delete the file after saving to gallery
    return true;
  } else {
    Alert.alert(
      "Permission Required",
      "Please grant permission to save the file to your gallery."
    );
    return false;
  }
}
