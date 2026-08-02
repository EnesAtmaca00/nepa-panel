import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { JobsProvider } from '@/lib/JobsContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
import RoleGuard from '@/components/RoleGuard';
import Dashboard from '@/pages/Dashboard';
import Companies from '@/pages/Companies';
import CompanyNew from '@/pages/CompanyNew';
import CompanyDetail from '@/pages/CompanyDetail';
import Services from '@/pages/Services';
import Invoices from '@/pages/Invoices';
import SpecialDays from '@/pages/SpecialDays';
import Recurring from '@/pages/Recurring';
import Targets from '@/pages/Targets';
import Settings from '@/pages/Settings';
import IcerikMerkezi from '@/pages/IcerikMerkezi';
import Tasks from '@/pages/Tasks';
import AIStudio from '@/pages/AIStudio';
import Approvals from '@/pages/Approvals';
import WebProjects from '@/pages/WebProjects.jsx';
import Reports from '@/pages/Reports';
import Notifications from '@/pages/Notifications';
import PublicApproval from '@/pages/PublicApproval';
import Login from '@/pages/Login';
import { Gizlilik, KullanimKosullari, VeriSilme } from '@/pages/Legal';
import QuickPlanning from '@/pages/QuickPlanning';
import AgentConnect from '@/pages/AgentConnect';
import Inbox from '@/pages/Inbox';
import Saglik from '@/pages/Saglik';
import Araclar from '@/pages/Araclar';
import Hesabim from '@/pages/Hesabim';
import Sozlesmeler from '@/pages/Sozlesmeler';
import FaturaSablonlari from '@/pages/FaturaSablonlari';
import Giderler from '@/pages/Giderler';
import AIAnaliz from '@/pages/AIAnaliz';
import FinansalAnaliz from '@/pages/FinansalAnaliz';
import SocialConnect from '@/pages/SocialConnect';
import InboxPro from '@/pages/InboxPro';
import HashtagKutuphanesi from '@/pages/HashtagKutuphanesi';
import MediaLibrary from '@/pages/MediaLibrary';
import Agents from '@/pages/Agents';
import Leads from '@/pages/Leads';
import Presentations from '@/pages/Presentations';
import AIErrorLogs from '@/pages/AIErrorLogs.jsx';
import PublishQueue from '@/pages/PublishQueue.jsx';

const AM = ["admin", "manager"];
const AME = ["admin", "manager", "editor"];
const AMEV = ["admin", "manager", "editor", "viewer"];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-yellow-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') return <UserNotRegisteredError />;

  // Oturum yoksa giriş ekranını GÖSTER, yönlendirme yapma.
  // Base44 sürümü burada window.location ile /giris'e atıyordu; o sayfa
  // olmadığı için sonsuz döngüye giriyordu. Müşteri onay linki oturum
  // gerektirmediği için açık kalmalı.
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/onay/:token" element={<PublicApproval />} />
      {/* Yasal sayfalar — Meta/TikTok/LinkedIn App Review inceleyicisi
          bunlara OTURUM AÇMADAN giriyor, o yüzden auth'ın dışındalar. */}
      <Route path="/gizlilik" element={<Gizlilik />} />
      <Route path="/kullanim-kosullari" element={<KullanimKosullari />} />
      <Route path="/veri-silme" element={<VeriSilme />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Public route */}
      <Route path="/onay/:token" element={<PublicApproval />} />
      <Route path="/giris" element={<Login />} />
      {/* Yasal sayfalar — Meta/TikTok/LinkedIn App Review inceleyicisi
          bunlara OTURUM AÇMADAN giriyor, o yüzden auth'ın dışındalar. */}
      <Route path="/gizlilik" element={<Gizlilik />} />
      <Route path="/kullanim-kosullari" element={<KullanimKosullari />} />
      <Route path="/veri-silme" element={<VeriSilme />} />


      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/anlik-planlama" element={<RoleGuard allowedRoles={AME}><QuickPlanning /></RoleGuard>} />
        <Route path="/icerik-takvimi" element={<RoleGuard allowedRoles={AME}><IcerikMerkezi /></RoleGuard>} />
        <Route path="/yayin-takvimi" element={<RoleGuard allowedRoles={AME}><IcerikMerkezi /></RoleGuard>} />
        <Route path="/gorevler" element={<Tasks />} />
        <Route path="/ai-studio" element={<RoleGuard allowedRoles={AME}><AIStudio /></RoleGuard>} />
        <Route path="/araclar" element={<Araclar />} />
        <Route path="/musteriler" element={<Companies />} />
        <Route path="/musteriler/yeni" element={<RoleGuard allowedRoles={AM}><CompanyNew /></RoleGuard>} />
        <Route path="/musteriler/:id/duzenle" element={<RoleGuard allowedRoles={AM}><CompanyNew /></RoleGuard>} />
        <Route path="/musteriler/:id" element={<CompanyDetail />} />
        <Route path="/onaylar" element={<RoleGuard allowedRoles={AME}><Approvals /></RoleGuard>} />
        <Route path="/ozel-gunler" element={<RoleGuard allowedRoles={AM}><SpecialDays /></RoleGuard>} />
        <Route path="/tekrarlayanlar" element={<RoleGuard allowedRoles={AME}><Recurring /></RoleGuard>} />
        <Route path="/hizmetler" element={<RoleGuard allowedRoles={AM}><Services /></RoleGuard>} />
        <Route path="/faturalar" element={<RoleGuard allowedRoles={AM}><Invoices /></RoleGuard>} />
        <Route path="/sozlesmeler" element={<RoleGuard allowedRoles={AM}><Sozlesmeler /></RoleGuard>} />
        <Route path="/hedefler" element={<RoleGuard allowedRoles={AME}><Targets /></RoleGuard>} />
        <Route path="/raporlar" element={<RoleGuard allowedRoles={AMEV}><Reports /></RoleGuard>} />
        <Route path="/inbox" element={<RoleGuard allowedRoles={AM}><Inbox /></RoleGuard>} />
        <Route path="/inbox-pro" element={<RoleGuard allowedRoles={AM}><InboxPro /></RoleGuard>} />
        {/* /inbox artık /inbox-pro'ya yönleniyor - her ikisi de çalışır */}
        <Route path="/sosyal-medya" element={<RoleGuard allowedRoles={AM}><SocialConnect /></RoleGuard>} />
        <Route path="/paylasim-sirasi" element={<RoleGuard allowedRoles={AME}><PublishQueue /></RoleGuard>} />
        <Route path="/hashtag-kutuphanesi" element={<RoleGuard allowedRoles={AME}><HashtagKutuphanesi /></RoleGuard>} />
        <Route path="/medya-kutuphanesi" element={<RoleGuard allowedRoles={AME}><MediaLibrary /></RoleGuard>} />
        <Route path="/asistan" element={<RoleGuard allowedRoles={AM}><AgentConnect /></RoleGuard>} />
        <Route path="/web-projeleri" element={<RoleGuard allowedRoles={AME}><WebProjects /></RoleGuard>} />
        <Route path="/ajanlar" element={<RoleGuard allowedRoles={AM}><Agents /></RoleGuard>} />
        <Route path="/leads" element={<RoleGuard allowedRoles={AM}><Leads /></RoleGuard>} />
        <Route path="/sunumlar" element={<RoleGuard allowedRoles={AM}><Presentations /></RoleGuard>} />
        <Route path="/ai-hata-gunlugu" element={<RoleGuard allowedRoles={AM}><AIErrorLogs /></RoleGuard>} />
        <Route path="/ayarlar" element={<RoleGuard allowedRoles={AM}><Settings /></RoleGuard>} />
        <Route path="/saglik" element={<RoleGuard allowedRoles={AM}><Saglik /></RoleGuard>} />
        <Route path="/fatura-sablonlari" element={<RoleGuard allowedRoles={AM}><FaturaSablonlari /></RoleGuard>} />
        <Route path="/giderler" element={<RoleGuard allowedRoles={AM}><Giderler /></RoleGuard>} />
        <Route path="/ai-analiz" element={<RoleGuard allowedRoles={AM}><AIAnaliz /></RoleGuard>} />
        <Route path="/finansal-analiz" element={<RoleGuard allowedRoles={AM}><FinansalAnaliz /></RoleGuard>} />
        <Route path="/hesabim" element={<Hesabim />} />
        <Route path="/bildirimler" element={<Notifications />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <JobsProvider>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <SonnerToaster position="top-right" richColors />
        </JobsProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App