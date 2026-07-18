import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer'; // Ensure this import exists

const Layout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        {/* Outlet renders the current route's element (e.g., Home) */}
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;