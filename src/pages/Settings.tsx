// TODO: Connect to backend API — no settings API exists yet; keep local state
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import {
  Settings as SettingsIcon,
  Bell,
  CreditCard,
  Shield,
  Globe,
  Mail,
  Phone,
  Clock,
  IndianRupee,
  CheckCircle,
  Car,
  Users,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { platformSettings, notificationSettings } from "@/data/mockData";

export function Settings() {
  const [notifications, setNotifications] = useState(notificationSettings);

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Platform Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-emerald-600" />
            Platform Configuration
          </CardTitle>
          <CardDescription>
            Core settings for the North Travena platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <SettingsIcon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Platform Name</p>
                    <p className="text-xs text-gray-500">Display name for the platform</p>
                  </div>
                </div>
                <span className="font-semibold">{platformSettings.platformName}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <IndianRupee className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Platform Fee</p>
                    <p className="text-xs text-gray-500">Commission percentage</p>
                  </div>
                </div>
                <span className="font-semibold">{platformSettings.platformFeePercentage}%</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Currency</p>
                    <p className="text-xs text-gray-500">Transaction currency</p>
                  </div>
                </div>
                <span className="font-semibold">{platformSettings.currency}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Payout Day</p>
                    <p className="text-xs text-gray-500">Captain payout schedule</p>
                  </div>
                </div>
                <span className="font-semibold">{platformSettings.payoutDay}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Globe className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Timezone</p>
                    <p className="text-xs text-gray-500">System timezone</p>
                  </div>
                </div>
                <span className="font-semibold">{platformSettings.timezone}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Mail className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Support Email</p>
                    <p className="text-xs text-gray-500">Customer support contact</p>
                  </div>
                </div>
                <span className="font-semibold text-sm">{platformSettings.supportEmail}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Phone className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Support Phone</p>
                    <p className="text-xs text-gray-500">Customer support hotline</p>
                  </div>
                </div>
                <span className="font-semibold">{platformSettings.supportPhone}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Shield className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Language</p>
                    <p className="text-xs text-gray-500">Supported languages</p>
                  </div>
                </div>
                <span className="font-semibold">{platformSettings.language}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-600" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Configure email, SMS, and push notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-gray-500">Receive updates via email</p>
                </div>
              </div>
              <Switch
                checked={notifications.emailNotifications}
                onCheckedChange={() => toggleNotification('emailNotifications')}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">SMS Notifications</p>
                  <p className="text-sm text-gray-500">Receive text message alerts</p>
                </div>
              </div>
              <Switch
                checked={notifications.smsNotifications}
                onCheckedChange={() => toggleNotification('smsNotifications')}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Bell className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-gray-500">Browser push notifications</p>
                </div>
              </div>
              <Switch
                checked={notifications.pushNotifications}
                onCheckedChange={() => toggleNotification('pushNotifications')}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium">Complaint Alerts</p>
                  <p className="text-sm text-gray-500">Get notified about new complaints</p>
                </div>
              </div>
              <Switch
                checked={notifications.complaintAlerts}
                onCheckedChange={() => toggleNotification('complaintAlerts')}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Car className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium">New Booking Alerts</p>
                  <p className="text-sm text-gray-500">Get notified about new bookings</p>
                </div>
              </div>
              <Switch
                checked={notifications.newBookingAlerts}
                onCheckedChange={() => toggleNotification('newBookingAlerts')}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Users className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium">Captain Approval Alerts</p>
                  <p className="text-sm text-gray-500">Get notified about pending approvals</p>
                </div>
              </div>
              <Switch
                checked={notifications.captainApprovalAlerts}
                onCheckedChange={() => toggleNotification('captainApprovalAlerts')}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium">Weekly Reports</p>
                  <p className="text-sm text-gray-500">Receive weekly performance reports</p>
                </div>
              </div>
              <Switch
                checked={notifications.weeklyReports}
                onCheckedChange={() => toggleNotification('weeklyReports')}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="font-medium">Monthly Reports</p>
                  <p className="text-sm text-gray-500">Receive monthly performance reports</p>
                </div>
              </div>
              <Switch
                checked={notifications.monthlyReports}
                onCheckedChange={() => toggleNotification('monthlyReports')}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}