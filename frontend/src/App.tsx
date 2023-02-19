import {
  ChakraProvider,
  theme,
} from "@chakra-ui/react"
import { AdminLayout } from "./layouts/AdminLayout"
import { CookieBanner } from "./components/shared/CookieBanner"
import { AuthProvider } from "./providers/AuthProvider"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import Login from "./pages/auth/Login"
import { LandingLayout } from "./layouts/LandingLayout"
import Home from "./pages/Home"
import NotFound from "./pages/NotFound"
import { RequireAuth } from "./components/auth/RequireAuth"
import Profile from "./pages/admin/Profile"
import Users from "./pages/admin/Users"
import User from "./pages/admin/User"
import Privacy from "./pages/Privacy"
import Terms from "./pages/Terms"
import Dashboard from "./pages/admin/Dashboard"
import Posts from "./pages/admin/Posts"
import { Post as LandingPost } from './pages/post/Post'
import Signup from "./pages/auth/Signup"
import { Posts as LandingPosts } from './pages/post/Posts'
import { Post } from "./pages/admin/Post"

export const App = () => {
  return (
    <ChakraProvider theme={theme}>
      <BrowserRouter>
        <CookieBanner />
        <AuthProvider>
          <Routes>

            <Route path="/" element={<LandingLayout />}>
              <Route index element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/posts" element={<LandingPosts />} />
              <Route path="/posts/:id" element={<LandingPost />} />
            </Route>
            <Route path='*' element={<NotFound />} />
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="/admin/profile" element={<Profile />} />
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/users/new" element={<User />} />
              <Route path="/admin/users/:id" element={<User />} />
              <Route path="/admin/posts" element={<Posts />} />
              <Route path="/admin/posts/new" element={<Post />} />
              <Route path="/admin/posts/:id" element={<Post />} />
            </Route>

          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ChakraProvider>
  )
}
