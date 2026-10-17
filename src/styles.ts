// Explicit style manifest. Files remain beside their owning page or component while
// this ordered entry point keeps Node-based component tests free of CSS imports.
import './fonts.css';
import './global.css';

// Shared application structure and primitives.
import './components/layout/Navbar.css';
import './components/layout/MarketplaceShell.css';
import './components/layout/Footer.css';
import './components/SellerAvatar.css';
import './components/feedback/Toast.css';

// Marketplace features.
import './components/marketplace/MarketplaceIntro.css';
import './components/marketplace/HeroAtmosphere.css';
import './components/marketplace/ListingSection.css';
import './components/marketplace/ListingCards.css';
import './components/marketplace/BuyerFilters.css';
import './components/marketplace/CoraActivity.css';
import './components/insights/InsightsSummary.css';

// Listing creation workflow.
import './components/create-item-wizard/CreateItemWizard.css';
import './components/create-item-wizard/PhotoDraft.css';

// Account and messaging components.
import './components/account/AccountPhoto.css';
import './components/messages/Chat.css';

// Page-owned styles.
import './pages/Login.css';
import './pages/SellingSpace.css';
import './pages/Item.css';
import './pages/Messages.css';
import './pages/agent-inbox/AgentInbox.css';
import './pages/Activity.css';
import './pages/Account.css';
