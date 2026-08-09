import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Mail, Lock, Palette, Tag, Download, Trash2,
  Plus, Pencil, Check, X, ShieldCheck, Moon, Sun,
} from "lucide-react";

import { useAuth } from "../context/useAuth";
import { useTheme } from "../context/ThemeContext";
import { updateProfile, changePassword, exportTransactionsCSV, deleteAccount } from "../services/settingsService";
import {
  getCategories, createCategory, updateCategory, deleteCategory,
} from "../services/statementsService";

function SectionCard({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Icon size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ children }) {
  return <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{children}</label>;
}

const inputClass =
  "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed";

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // --- Profile ---
  const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "", email: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      await updateProfile(profileForm);
      await refreshUser();
      setProfileMessage({ type: "success", text: "Profile updated." });
    } catch (err) {
      setProfileMessage({ type: "error", text: err.response?.data?.error || "Failed to update profile." });
    } finally {
      setProfileSaving(false);
    }
  };

  // --- Password ---
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords don't match." });
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMessage({ type: "success", text: "Password updated." });
    } catch (err) {
      const apiError = err.response?.data?.error;
      const text = Array.isArray(apiError) ? apiError.join(" ") : apiError || "Failed to update password.";
      setPasswordMessage({ type: "error", text });
    } finally {
      setPasswordSaving(false);
    }
  };

  // --- Categories ---
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [categoryError, setCategoryError] = useState(null);

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const data = await getCategories();
      setCategories(data);
    } catch {
      setCategoryError("Failed to load categories.");
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      setCategoryError(null);
      await createCategory(name);
      setNewCategoryName("");
      await loadCategories();
    } catch (err) {
      setCategoryError(err.response?.data?.name?.[0] || "Failed to add category.");
    }
  };

  const startEditing = (category) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEditing = async (id) => {
    const name = editingName.trim();
    if (!name) return;
    try {
      setCategoryError(null);
      await updateCategory(id, name);
      cancelEditing();
      await loadCategories();
    } catch (err) {
      setCategoryError(err.response?.data?.name?.[0] || "Failed to rename category.");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Delete this category? Transactions using it will become uncategorized.")) return;
    try {
      setCategoryError(null);
      await deleteCategory(id);
      await loadCategories();
    } catch (err) {
      setCategoryError(err.response?.data?.error || "Failed to delete category.");
    }
  };

  // --- Data / danger zone ---
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportTransactionsCSV();
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
      navigate("/login", { replace: true });
    } catch (err) {
      setDeleteError(err.response?.data?.error || "Failed to delete account.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Manage your profile, security, categories, and data.
        </p>
      </div>

      {/* Profile */}
      <SectionCard icon={User} title="Profile" subtitle="Your name and email address">
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <FieldLabel>Username</FieldLabel>
            <input className={inputClass} value={user?.username || ""} disabled />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>First name</FieldLabel>
              <input
                className={inputClass}
                value={profileForm.first_name}
                onChange={(e) => setProfileForm((f) => ({ ...f, first_name: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Last name</FieldLabel>
              <input
                className={inputClass}
                value={profileForm.last_name}
                onChange={(e) => setProfileForm((f) => ({ ...f, last_name: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                className={`${inputClass} pl-10`}
                value={profileForm.email}
                onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>

          {profileMessage && (
            <p className={`text-sm ${profileMessage.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {profileMessage.text}
            </p>
          )}

          <button
            type="submit"
            disabled={profileSaving}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
          >
            {profileSaving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </SectionCard>

      {/* Appearance */}
      <SectionCard icon={Palette} title="Appearance" subtitle="Choose how the app looks">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          Switch to {theme === "dark" ? "light" : "dark"} mode
        </button>
      </SectionCard>

      {/* Security */}
      <SectionCard icon={Lock} title="Security" subtitle="Password and sign-in method">
        <div className="mb-5 flex items-center gap-2 text-sm">
          <ShieldCheck size={16} className="text-blue-600 dark:text-blue-400" />
          <span className="text-slate-600 dark:text-slate-400">
            Signed in via{" "}
            <span className="font-semibold text-slate-800 dark:text-white">
              {user?.is_google_linked ? "Google" : "Username & password"}
            </span>
          </span>
        </div>

        {user?.has_usable_password === false ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            This account uses Google sign-in, so there's no password to change here.
          </p>
        ) : (
          <form onSubmit={handlePasswordSave} className="space-y-4 max-w-md">
            <div>
              <FieldLabel>Current password</FieldLabel>
              <input
                type="password"
                className={inputClass}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
                required
              />
            </div>
            <div>
              <FieldLabel>New password</FieldLabel>
              <input
                type="password"
                className={inputClass}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
                required
              />
            </div>
            <div>
              <FieldLabel>Confirm new password</FieldLabel>
              <input
                type="password"
                className={inputClass}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                required
              />
            </div>

            {passwordMessage && (
              <p className={`text-sm ${passwordMessage.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {passwordMessage.text}
              </p>
            )}

            <button
              type="submit"
              disabled={passwordSaving}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
            >
              {passwordSaving ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </SectionCard>

      {/* Categories
      <SectionCard icon={Tag} title="Categories" subtitle="Manage the categories used across your dashboard">
        <form onSubmit={handleAddCategory} className="flex gap-2 mb-5">
          <input
            className={inputClass}
            placeholder="New category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition whitespace-nowrap"
          >
            <Plus size={16} />
            Add
          </button>
        </form>

        {categoryError && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">{categoryError}</p>
        )}

        {categoriesLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading categories...</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between py-3">
                {editingId === category.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      className={inputClass}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                    />
                    <button onClick={() => saveEditing(category.id)} className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
                      <Check size={16} />
                    </button>
                    <button onClick={cancelEditing} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800 dark:text-white">{category.name}</span>
                      {category.is_default && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEditing(category)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Pencil size={14} />
                      </button>
                      {!category.is_default && (
                        <button onClick={() => handleDeleteCategory(category.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard> */}

      {/* Data & danger zone */}
      <SectionCard icon={Download} title="Data" subtitle="Export your data or delete your account">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-4">
          <div>
            <p className="font-medium text-slate-800 dark:text-white">Export transactions</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Download all your transactions as a CSV file.</p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-60"
          >
            <Download size={16} />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>

        <div className="rounded-xl border border-red-200 dark:border-red-500/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-700 dark:text-red-400">Delete account</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Permanently deletes your account, statements, transactions, and chat history.
              </p>
            </div>
            <button
              onClick={() => setDeleteOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-500/30 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>

          {deleteOpen && (
            <form onSubmit={handleDeleteAccount} className="mt-4 space-y-3 border-t border-red-100 dark:border-red-500/20 pt-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                This cannot be undone. {user?.has_usable_password ? "Enter your password to confirm." : "Confirm to permanently delete your account."}
              </p>
              {user?.has_usable_password && (
                <input
                  type="password"
                  placeholder="Password"
                  className={inputClass}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                />
              )}
              {deleteError && <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>}
              <button
                type="submit"
                disabled={deleting}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Permanently delete my account"}
              </button>
            </form>
          )}
        </div>
      </SectionCard>
    </div>
  );
}