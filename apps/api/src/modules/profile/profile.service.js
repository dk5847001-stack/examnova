export const profileService = {
  getProfile(user) {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      avatarUrl: user.avatarUrl || "",
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isBlocked: Boolean(user.isBlocked || user.status === "blocked"),
      status: user.status,
      bio: user.bio || "",
      academicProfile: user.academicProfile || {
        university: "",
        branch: "",
        year: "",
        semester: "",
      },
      preferences: user.preferences || {
        emailNotifications: true,
        productUpdates: true,
        marketplaceAlerts: true,
      },
      sellerProfile: user.sellerProfile || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },

  async updateProfile(user, payload) {
    user.name = payload.name?.trim() || user.name;
    user.phone = payload.phone?.trim() || "";
    user.avatarUrl = payload.avatarUrl?.trim() || "";
    user.bio = payload.bio?.trim() || "";
    user.academicProfile = {
      university: payload.university || "",
      branch: payload.branch || "",
      year: payload.year || "",
      semester: payload.semester || "",
    };

    await user.save();
    return this.getProfile(user);
  },

  async updateSettings(user, payload) {
    user.preferences = {
      emailNotifications: Boolean(payload.emailNotifications),
      productUpdates: Boolean(payload.productUpdates),
      marketplaceAlerts: Boolean(payload.marketplaceAlerts),
    };

    await user.save();
    return this.getProfile(user);
  },
};
