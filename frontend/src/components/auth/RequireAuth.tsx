import { useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider";

interface ProtectedRouteProps {
  children: JSX.Element;
}

function RequireAuth({ children }: ProtectedRouteProps) {
  const { user } = useAuth()
  let location = useLocation();

    if (!user) {
        // user is not authenticated
        console.log('user', user)
        return <Navigate to="/signin" state={{ from: location }} replace/>;
    }
    return <>{children}</>
}

export { RequireAuth };
