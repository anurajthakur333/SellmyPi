import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AppNavbar } from './components/Navbar'
import { Home } from './pages/Home'
import { Sell } from './pages/Sell'
import { Dashboard } from './pages/Dashboard'
import { Admin } from './pages/Admin'
import {useAuth, useUser } from "@clerk/clerk-react"
// Import Blueprint CSS
import "@blueprintjs/core/lib/css/blueprint.css"
import "@blueprintjs/icons/lib/css/blueprint-icons.css"
import './App.css'


function App() {

  const { user } = useUser();
  const { isSignedIn } = useAuth();

  // Check if user is admin
  const isAdmin = user?.publicMetadata?.role === 'admin';

  return (
    <Router>
      <div>
        <AppNavbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/Dashboard" element={<Dashboard />} />
          <Route path="/admin" element={
            isSignedIn && isAdmin ? (
              <Admin />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
      </Routes>
      </div>
    </Router>
  )
}

export default App
