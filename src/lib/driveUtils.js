/**
 * Google Drive URL'lerinden thumbnail oluşturur
 */
export function getDriveThumbnailUrl(driveUrl, size = 400) {
  if (!driveUrl) return null;
  
  // Drive file_id çıkar
  const match = driveUrl.match(/\/d\/([^/?]+)/);
  if (!match) return driveUrl;
  
  const fileId = match[1];
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

export function getDriveDirectLink(driveUrl, size = 1000) {
  if (!driveUrl) return null;
  
  const match = driveUrl.match(/\/d\/([^/?]+)/);
  if (!match) return driveUrl;
  
  const fileId = match[1];
  return `https://lh3.googleusercontent.com/d/${fileId}=s${size}`;
}
