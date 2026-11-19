// TAMBAH di dalam function doPost(e), SELEPAS pengesahan RENDER_SHARED_SECRET,
// SELEPAS blok upload_video, SEBELUM UNKNOWN_ACTION.
// Ia menggunakan pemboleh ubah "data" dan "output" yang sudah wujud.
//
// Rakaman hanya boleh dibaca oleh backend Render yang memiliki secret.
// Render juga menyemak bahawa guru mengajar murid yang menghantar video.

if (data.action === "read_video") {
  if (typeof data.fileId !== "string" ||
      !/^[A-Za-z0-9_-]{10,200}$/.test(data.fileId)) {
    return output({ok:false,error:"INVALID_FILE_ID"});
  }
  const folderId = PropertiesService.getScriptProperties().getProperty("FOLDER_ID");
  if (!folderId) return output({ok:false,error:"FOLDER_NOT_CONFIGURED"});
  const file = DriveApp.getFileById(data.fileId);
  let inside = false;
  const parents = file.getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === folderId) inside = true;
  }
  if (!inside || file.isTrashed()) return output({ok:false,error:"FILE_NOT_ALLOWED"});
  const mimeType = file.getMimeType();
  if (!["video/webm","video/mp4"].includes(mimeType) ||
      file.getSize() > 2*1024*1024) {
    return output({ok:false,error:"INVALID_VIDEO"});
  }
  return output({
    ok:true,
    mimeType,
    videoBase64:Utilities.base64Encode(file.getBlob().getBytes())
  });
}

// Pastikan folder Google Drive kekal Restricted.
// Versi percubaan ini hanya menyokong video sehingga 2MB.
// Selepas menambah kod, Save > Deploy > Manage deployments > Edit > New version > Deploy.
