import axios from "axios";
import { UserContextProvider } from "./UserContext";
import Routes from "./Routes";

function App() {
  axios.defaults.baseURL = "http://localhost:5000";
  axios.defaults.imageURL = "https://";

  axios.defaults.withCredentials = true;

  return (
    <UserContextProvider>
      <Routes />
    </UserContextProvider>
  );
}

export default App;

// "start": "react-scripts start",
// "dev": "react-scripts start",
// "build": "vite build",
// "lint": "eslint src --ext js,jsx --report-unused-disable-directives --max-warnings 0",
// "preview": "vite preview"
