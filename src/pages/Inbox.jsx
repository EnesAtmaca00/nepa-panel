// Inbox ve InboxPro birleştirildi. Tüm özellikler /inbox-pro adresinde.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Inbox() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/inbox-pro", { replace: true }); }, [navigate]);
  return null;
}