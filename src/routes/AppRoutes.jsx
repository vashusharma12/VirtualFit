import { Routes, Route } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import ProtectedRoute from '../components/layout/ProtectedRoute'

import Home from '../pages/Home'
import HowItWorksPage from '../pages/HowItWorks'
import About from '../pages/About'
import Login from '../pages/Login'
import Signup from '../pages/Signup'
import Dashboard from '../pages/Dashboard'
import Profile from '../pages/Profile'
import Measurements from '../pages/Measurements'
import BodyProfile from '../pages/BodyProfile'
import Products from '../pages/Products'
import ProductDetails from '../pages/ProductDetails'
import TryOn from '../pages/TryOn'
import SizeGuide from '../pages/SizeGuide'
import Results from '../pages/Results'
import Settings from '../pages/Settings'
import NotFound from '../pages/NotFound'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PageShell />}>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetails />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/measurements" element={<Measurements />} />
          <Route path="/body-profile" element={<BodyProfile />} />
          <Route path="/size-guide" element={<SizeGuide />} />
          <Route path="/try-on" element={<TryOn />} />
          <Route path="/results" element={<Results />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
