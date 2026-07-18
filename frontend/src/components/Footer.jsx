import { Mail, Phone } from 'lucide-react';
import ContactAdminModal from './ContactAdminModel';
import Text from './ui/Text';

const Footer = () => {
  return (
    <footer className="bg-[var(--pms-bg-inset)] text-white py-6 border-t border-[var(--pms-bg-header)] text-sm mt-auto">
      <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-wrap justify-center gap-6 text-gray-400">
          <p className="flex items-center gap-2">
            <Mail className="text-purple-500" size={17} /> pms@gmail.com
          </p>
          <p className="flex items-center gap-2">
            <Phone className="text-purple-500" size={17} /> 0515788334
          </p>
        </div>

        <ContactAdminModal />
      </div>

      <hr className="border-[var(--pms-bg-header)] w-4/5 mx-auto my-4" />
      <Text size="text-xs" color="text-gray-500" className="text-center">
        &copy; 2026 PMS. All Rights Reserved.
      </Text>
    </footer>
  );
};

export default Footer;