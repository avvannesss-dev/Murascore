import { useRef, useState } from 'react';
import { Camera, Shield } from 'lucide-react';
import type { Profile } from '../types';
import { compressImage, uploadImage, updateProfileBanner, updateProfileAvatar } from '../lib/storage';

interface Props {
  nickname: string;
  profile: Profile;
  onBannerUpdated: () => void;
  onAvatarUpdated: () => void;
}

export function UserProfile({ nickname, profile, onBannerUpdated, onAvatarUpdated }: Props) {
  const bannerRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const compressed = await compressImage(file, 1200, 400, 0.8);
    const url = await uploadImage(compressed);
    if (url) {
      await updateProfileBanner(nickname, url);
      onBannerUpdated();
    }
    setUploading(false);
    if (bannerRef.current) bannerRef.current.value = '';
  }

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const compressed = await compressImage(file, 200, 200, 0.85);
    const url = await uploadImage(compressed);
    if (url) {
      await updateProfileAvatar(nickname, url);
      onAvatarUpdated();
    }
    setUploading(false);
    if (avatarRef.current) avatarRef.current.value = '';
  }

  return (
    <div className="userprofile">
      <div
        className="userprofile__banner"
        onClick={() => !uploading && bannerRef.current?.click()}
        style={profile.bannerUrl ? { backgroundImage: `url(${profile.bannerUrl})` } : undefined}
      >
        {!profile.bannerUrl && <div className="userprofile__banner-placeholder" />}
        <div className="userprofile__banner-overlay">
          <Camera size={20} />
          <span>{uploading ? '...' : 'СМЕНИТЬ ОБЛОЖКУ'}</span>
        </div>
        <input ref={bannerRef} type="file" accept="image/*" className="comment__file-hidden" onChange={handleBanner} />
      </div>

      <div className="userprofile__avatar-area">
        <div
          className="userprofile__avatar"
          onClick={() => !uploading && avatarRef.current?.click()}
        >
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={nickname} className="userprofile__avatar-img" />
          ) : (
            <Shield size={32} className="userprofile__avatar-placeholder" />
          )}
          <div className="userprofile__avatar-overlay">
            <Camera size={16} />
          </div>
          <input ref={avatarRef} type="file" accept="image/*" className="comment__file-hidden" onChange={handleAvatar} />
        </div>
        <span className="userprofile__nick">{nickname}</span>
      </div>

      <div className="userprofile__stats">
        <span>👥 {profile.following.length} подписок</span>
      </div>
    </div>
  );
}
