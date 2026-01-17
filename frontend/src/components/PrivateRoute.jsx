import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ children }) {
    const { user, token } = useAuth();

    // If no user or token, redirect to login
    if (!user || !token) {
        return <Navigate to="/login" />;
    }

    return children;
}
