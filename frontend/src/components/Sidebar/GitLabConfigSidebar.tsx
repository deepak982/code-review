import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { api, type GitLabConfig, type GitLabConfigCreate } from "@/services/api"
import { toast } from "sonner"
import { GitBranch, Plus, Trash2, X, Settings, LogOut, Loader2, Pencil } from "lucide-react"
import { authService } from "@/services/auth"
import { useNavigate } from "react-router-dom"

interface GitLabConfigSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function GitLabConfigSidebar({ isOpen, onClose }: GitLabConfigSidebarProps) {
  const [configs, setConfigs] = useState<GitLabConfig[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newConfig, setNewConfig] = useState<GitLabConfigCreate>({
    config_name: "",
    gitlab_url: "",
    access_token: "",
    project_id: "",
  })
  const [validationStatus, setValidationStatus] = useState<{
    isValidating: boolean
    message?: string
  }>({ isValidating: false })
  const [editingConfig, setEditingConfig] = useState<GitLabConfig | null>(null)
  const navigate = useNavigate()
  const user = authService.getUser()

  useEffect(() => {
    if (isOpen) {
      fetchConfigs()
    }
  }, [isOpen])

  const fetchConfigs = async () => {
    try {
      const data = await api.getGitLabConfigs()
      setConfigs(data)
    } catch (error) {
      toast.error("Failed to load GitLab configurations")
    }
  }

  const handleEditConfig = (config: GitLabConfig) => {
    setEditingConfig(config)
    setNewConfig({
      config_name: config.config_name || "",
      gitlab_url: config.gitlab_url,
      access_token: "", // Don't pre-fill token for security
      project_id: config.project_id || "",
    })
    setShowAddForm(true)
  }

  const handleSaveConfig = async () => {
    // Validate required fields
    if (!newConfig.gitlab_url) {
      toast.error("GitLab URL is required")
      return
    }

    // For new configs, access token is required
    // For editing, it's optional (only needed if changing token)
    if (!editingConfig && !newConfig.access_token) {
      toast.error("Access token is required")
      return
    }

    setIsLoading(true)
    setValidationStatus({ isValidating: true })

    try {
      let response: GitLabConfig

      if (editingConfig) {
        // Update existing configuration
        // Only include access_token if it was provided (to change it)
        const updateData: GitLabConfigCreate = newConfig.access_token
          ? newConfig
          : {
              config_name: newConfig.config_name,
              gitlab_url: newConfig.gitlab_url,
              project_id: newConfig.project_id,
              access_token: "" // Empty string means don't update token
            }

        response = await api.updateGitLabConfig(editingConfig.id, updateData)
      } else {
        // Create new configuration
        response = await api.createGitLabConfig(newConfig)
      }

      // Check validation result
      if (response.is_active) {
        toast.success(
          `GitLab configuration ${editingConfig ? 'updated' : 'added'} successfully${
            response.gitlab_username ? ` for user @${response.gitlab_username}` : ''
          }`
        )
      } else {
        // Show warning if credentials are invalid but config was saved
        toast.warning(
          response.validation_message || "Configuration saved but credentials are invalid",
          { duration: 5000 }
        )
      }

      setNewConfig({ config_name: "", gitlab_url: "", access_token: "", project_id: "" })
      setShowAddForm(false)
      setEditingConfig(null)
      setValidationStatus({ isValidating: false })
      fetchConfigs()
    } catch (error) {
      setValidationStatus({ isValidating: false })
      toast.error(error instanceof Error ? error.message : `Failed to ${editingConfig ? 'update' : 'add'} configuration`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setShowAddForm(false)
    setEditingConfig(null)
    setNewConfig({ config_name: "", gitlab_url: "", access_token: "", project_id: "" })
  }

  const handleDeleteConfig = async (configId: string) => {
    if (!confirm("Are you sure you want to delete this configuration?")) {
      return
    }

    try {
      await api.deleteGitLabConfig(configId)
      toast.success("Configuration deleted")
      fetchConfigs()
    } catch (error) {
      toast.error("Failed to delete configuration")
    }
  }

  const handleLogout = () => {
    authService.clearAuth()
    toast.success("Logged out successfully")
    navigate("/login")
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-slate-700" />
              <h2 className="text-lg font-semibold text-slate-900">Settings</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User Info */}
          {user && (
            <Card className="p-4 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{user.username}</p>
                  <p className="text-sm text-slate-600">{user.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </Button>
              </div>
            </Card>
          )}

          {/* GitLab Configurations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-slate-700" />
                <h3 className="font-medium text-slate-900">GitLab Configurations</h3>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddForm(!showAddForm)}
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Add Config Form */}
            {showAddForm && (
              <Card className="p-4 space-y-3 border-blue-200 bg-blue-50/50">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Configuration Name (Optional)
                  </label>
                  <Input
                    placeholder="e.g., Personal GitLab, Work Account, Client XYZ"
                    value={newConfig.config_name}
                    onChange={(e) =>
                      setNewConfig({ ...newConfig, config_name: e.target.value })
                    }
                    disabled={isLoading}
                  />
                  <p className="text-xs text-slate-500">
                    Give this configuration a friendly name to easily identify it
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">GitLab URL *</label>
                  <Input
                    placeholder="https://gitlab.com"
                    value={newConfig.gitlab_url}
                    onChange={(e) =>
                      setNewConfig({ ...newConfig, gitlab_url: e.target.value })
                    }
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Access Token {editingConfig ? "(Optional - leave empty to keep current)" : "*"}
                  </label>
                  <Input
                    type="password"
                    placeholder={editingConfig ? "Leave empty to keep current token" : "glpat-xxxxxxxxxxxxxxxxxxxx"}
                    value={newConfig.access_token}
                    onChange={(e) =>
                      setNewConfig({ ...newConfig, access_token: e.target.value })
                    }
                    disabled={isLoading}
                  />
                </div>
                {validationStatus.isValidating && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Validating credentials with GitLab...</span>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Project ID (Optional)</label>
                  <Input
                    placeholder="12345"
                    value={newConfig.project_id}
                    onChange={(e) =>
                      setNewConfig({ ...newConfig, project_id: e.target.value })
                    }
                    disabled={isLoading}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveConfig}
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? (
                      validationStatus.isValidating ? "Validating..." : editingConfig ? "Updating..." : "Adding..."
                    ) : editingConfig ? "Update Configuration" : "Add Configuration"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            )}

            {/* Config List */}
            <div className="space-y-3">
              {configs.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No GitLab configurations yet
                </p>
              ) : (
                configs.map((config) => (
                  <Card key={config.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 text-sm">
                          {config.config_name || config.gitlab_url}
                        </p>
                        {config.config_name && (
                          <p className="text-xs text-slate-500 mt-1">
                            {config.gitlab_url}
                          </p>
                        )}
                        {config.project_id && (
                          <p className="text-xs text-slate-500 mt-1">
                            Project: {config.project_id}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          Added: {new Date(config.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1 -mt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditConfig(config)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteConfig(config.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          config.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {config.is_active ? "✓ Valid" : "⚠ Invalid"}
                      </span>

                      {/* Show validation message if credentials are invalid */}
                      {!config.is_active && config.validation_message && (
                        <p className="text-xs text-red-600">
                          {config.validation_message}
                        </p>
                      )}

                      {/* Show GitLab username if available */}
                      {config.gitlab_username && (
                        <p className="text-xs text-slate-500">
                          @{config.gitlab_username}
                        </p>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
