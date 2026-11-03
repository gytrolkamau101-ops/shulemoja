import { btnGreen } from '../../components/ui'
import ImagePicker from '../../components/ImagePicker'
import { saField, saFieldStyle, saTd, saTh } from './saStyles'


export default function ThemeTab({ theme, setTheme, savingCms, saveCms }) {
  return (
    <>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 text-slate-100">
            <h2 className="text-xl font-black text-white">Platform look</h2>
            <p className="text-sm text-slate-300">Applies to Super Admin header and public login branding. After save, hard-refresh the login page.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <label className="text-xs text-slate-400">
                Primary
                <input type="color" className="block w-full h-10 mt-1 rounded" value={theme.primary} onChange={(e) => setTheme({ ...theme, primary: e.target.value })} />
              </label>
              <label className="text-xs text-slate-400">
                Accent
                <input type="color" className="block w-full h-10 mt-1 rounded" value={theme.accent} onChange={(e) => setTheme({ ...theme, accent: e.target.value })} />
              </label>
              <label className="text-xs text-slate-400">
                Icon letters
                <input className={saField} style={{ color: "#f8fafc", backgroundColor: "#1e293b" }} maxLength={3} value={theme.logo_text} onChange={(e) => setTheme({ ...theme, logo_text: e.target.value })} />
              </label>
              <label className="text-xs text-slate-400">
                Background from
                <input type="color" className="block w-full h-10 mt-1 rounded" value={theme.bg_from} onChange={(e) => setTheme({ ...theme, bg_from: e.target.value })} />
              </label>
              <label className="text-xs text-slate-400">
                Background to
                <input type="color" className="block w-full h-10 mt-1 rounded" value={theme.bg_to} onChange={(e) => setTheme({ ...theme, bg_to: e.target.value })} />
              </label>
              <label className="text-xs text-slate-400">
                Style
                <select className={saField} style={{ color: "#f8fafc", backgroundColor: "#1e293b" }} value={theme.bg_style} onChange={(e) => setTheme({ ...theme, bg_style: e.target.value })}>
                  <option value="gradient" className="bg-slate-900 text-white">Gradient</option>
                  <option value="solid" className="bg-slate-900 text-white">Solid</option>
                </select>
              </label>
            </div>
            <div
              className="h-24 rounded-2xl border border-white/10 flex items-center justify-center font-black text-2xl"
              style={{
                background: theme.bg_style === 'solid' ? theme.bg_from : `linear-gradient(135deg, ${theme.bg_from}, ${theme.bg_to})`,
              }}
            >
              <span className="px-4 py-2 rounded-xl text-white" style={{ background: theme.primary }}>
                {theme.logo_text || 'SM'} Preview
              </span>
            </div>
            <div className="mb-3">
              <ImagePicker
                dark
                label="Login brand image — pick from gallery or camera"
                value={theme.brand_logo_url || ''}
                onChange={(url) => setTheme({ ...theme, brand_logo_url: url })}
                maxW={520}
                quality={0.62}
                previewClass="h-24 object-contain rounded-lg border border-slate-600 bg-black"
                showUrlField
              />
              <p className="text-xs text-slate-400 mt-1">
                After picking an image, you <strong className="text-white">must</strong> tap
                &quot;Save theme &amp; branding&quot; below. Remove custom image + Save restores the built-in logo.
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4 space-y-3">
              <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">Public login branding</h3>
              <p className="text-xs text-slate-400">Controls the words under the logo on the login page and related public labels. Leave blank to use defaults.</p>
              <label className="block text-xs text-slate-400">Product name
                <input className={saField} style={{ color: "#f8fafc", backgroundColor: "#1e293b" }} value={theme.brand_name || ''} onChange={(e) => setTheme({ ...theme, brand_name: e.target.value })} placeholder="ShuleMoja" />
              </label>
              <label className="block text-xs text-slate-400">Tagline (on logo / marketing)
                <input className={saField} style={{ color: "#f8fafc", backgroundColor: "#1e293b" }} value={theme.tagline || ''} onChange={(e) => setTheme({ ...theme, tagline: e.target.value })} placeholder="Run the school. Keep the history." />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs text-slate-400">Line under logo (left)
                  <input className={saField} style={{ color: "#f8fafc", backgroundColor: "#1e293b" }} value={theme.product_line || ''} onChange={(e) => setTheme({ ...theme, product_line: e.target.value })} placeholder="School Management" />
                </label>
                <label className="block text-xs text-slate-400">Line under logo (right)
                  <input className={saField} style={{ color: "#f8fafc", backgroundColor: "#1e293b" }} value={theme.country_line || ''} onChange={(e) => setTheme({ ...theme, country_line: e.target.value })} placeholder="Kenya" />
                </label>
              </div>
              <label className="block text-xs text-slate-400">Company line (“by …”)
                <input className={saField} style={{ color: "#f8fafc", backgroundColor: "#1e293b" }} value={theme.company_line || ''} onChange={(e) => setTheme({ ...theme, company_line: e.target.value })} placeholder="BigDataKE Technologies" />
              </label>
              <label className="block text-xs text-slate-400">Paragraph under the image (login)
                <textarea className={saField} style={{ color: "#f8fafc", backgroundColor: "#1e293b" }} rows={3} value={theme.login_subtext ?? ''} onChange={(e) => setTheme({ ...theme, login_subtext: e.target.value })} placeholder="Text under the logo on login (leave empty for none)" />
                <button type="button" className="text-xs font-bold text-amber-300 mt-1" onClick={() => setTheme({ ...theme, login_subtext: '' })}>Clear login text under logo</button>
              </label>
              <label className="block text-xs text-slate-400">Footer copyright
                <input className={saField} style={{ color: "#f8fafc", backgroundColor: "#1e293b" }} value={theme.footer_text || ''} onChange={(e) => setTheme({ ...theme, footer_text: e.target.value })} placeholder="© BigDataKE Technologies. All rights reserved." />
              </label>
            </div>

            <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
              <strong>How to change the login logo:</strong> use the image picker above (gallery/camera), then tap
              <strong> Save theme &amp; branding</strong>. Refresh the login page. Prefer a tall image (phone + logo)
              under ~400KB. If upload fails, the default file in <code>public/logo-c2.jpg</code> is used after deploy.
            </p>
            <button type="button" disabled={savingCms} className={btnGreen} onClick={() => saveCms('theme', theme)}>
              Save theme &amp; branding for whole platform
            </button>
          </div>
    </>
  )
}
