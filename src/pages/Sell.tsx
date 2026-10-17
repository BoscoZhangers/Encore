import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera } from 'lucide-react';
import { api } from '../api';
import { Spinner } from '../components/ui';
import { CreateItemWizard } from '../components/create-item-wizard/CreateItemWizard';
import type { Tell } from '../components/feedback/Toast';

const blankItem = {
  title: '',
  description: '',
  category: '',
  condition: '',
  price: 0,
  floor: 0,
  quantity: 1,
  area: '',
  latitude: null,
  longitude: null,
  pickup: '',
  photos: [] as string[],
  facts: [] as any[],
  private_notes: '',
  contact: '',
  share_contact: false,
  wallet: '',
  sol_lamports: 0,
  status: 'draft',
};

export function Sell({ tell }: { tell: Tell }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<any>({ ...blankItem, photos: [], facts: [] });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!id);
  useEffect(() => {
    if (!id) return;
    api('/seller/listings')
      .then((data) => {
        const found = data.listings.find((listing: any) => listing.id === id);
        if (!found) throw Error('Listing not found');
        setItem(found);
      })
      .catch((e) => tell(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [id]);
  async function save(skipPayment = false) {
    if (busy) return;
    setBusy(true);
    try {
      await api(id ? `/listings/${id}` : '/listings', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify({
          ...item,
          price: Math.round(item.price),
          floor: Math.round(item.floor),
          ...(skipPayment ? { wallet: '', sol_lamports: 0 } : {}),
        }),
      });
      tell(
        item.status === 'published'
          ? 'Your item is live. Let its next chapter begin.'
          : 'Draft saved.',
      );
      navigate('/selling');
    } catch (e: any) {
      tell(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Spinner />;
  return (
    <div className="page editor-page">
      <Link to="/selling" className="back">
        <ArrowLeft size={16} /> Your selling space
      </Link>
      <div className="page-title">
        <div>
          <div className="eyebrow">
            <Camera size={14} /> Make room for a new chapter
          </div>
          <h1>{id ? 'Make it yours.' : 'What’s ready for an encore?'}</h1>
          <p className="muted">A few honest details help your agent speak for you.</p>
        </div>
      </div>
      <CreateItemWizard
        item={item}
        setItem={setItem}
        busy={busy}
        tell={tell}
        editing={!!id}
        onSave={save}
        onDelete={async () => {
          if (
            !id ||
            !confirm(
              'Delete this listing and its conversations? Resolve active reservations first.',
            )
          )
            return;
          try {
            await api(`/listings/${id}`, { method: 'DELETE' });
            tell('Listing deleted.');
            navigate('/selling');
          } catch (deleteError: any) {
            tell(deleteError.message, 'error');
          }
        }}
      />
    </div>
  );
}
