import './globals.css';
import { AuthProvider } from '../lib/AuthContext';

export const metadata = {
  title: 'EventPro',
  description: 'Management evenimente HoReCa',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
