import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import { socket } from "./lib/socket";

export default function App() {
  useEffect(() => {
    // connect sekali
    if (!socket.connected) socket.connect();

    // join room admin ketika connect (dan aman saat reconnect)
    const joinAdmin = () => {
      socket.emit("join", "admin");
    };

    socket.on("connect", joinAdmin);

    // kalau sudah terhubung sebelum listener dipasang
    if (socket.connected) joinAdmin();

    return () => {
      socket.off("connect", joinAdmin);
      // jangan disconnect di sini
      // biarkan socket tetap hidup selama app berjalan
    };
  }, []);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
