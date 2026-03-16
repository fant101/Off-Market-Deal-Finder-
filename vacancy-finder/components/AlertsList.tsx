"use client";

import Badge from "./ui/Badge";
import Button from "./ui/Button";
import type { WatchlistAlert } from "@/lib/signals/types";

interface AlertsListProps {
  alerts: WatchlistAlert[];
  onMarkRead: (alertIds: string[]) => void;
}

export default function AlertsList({ alerts, onMarkRead }: AlertsListProps) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-lg border border-resolute-border">
        <p className="text-gray-500 text-sm">No alerts yet.</p>
        <p className="text-gray-400 text-xs mt-1">
          Alerts appear when your watchlists detect new vacancies.
        </p>
      </div>
    );
  }

  const unreadAlerts = alerts.filter((a) => !a.read);

  return (
    <div className="space-y-2">
      {unreadAlerts.length > 0 && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onMarkRead(unreadAlerts.map((a) => a.id))}
          >
            Mark all read
          </Button>
        </div>
      )}

      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`bg-white rounded-lg border p-3 ${
            alert.read
              ? "border-resolute-border"
              : "border-resolute-gold bg-resolute-gold/5"
          }`}
        >
          <div className="flex items-start gap-2">
            {!alert.read && (
              <span className="w-2 h-2 rounded-full bg-resolute-gold mt-1.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-resolute-dark-green truncate">
                  {alert.title}
                </h4>
                <Badge
                  variant={
                    alert.alert_type === "new_vacancy"
                      ? "high"
                      : alert.alert_type === "new_signal"
                        ? "medium"
                        : "default"
                  }
                >
                  {alert.alert_type.replace(/_/g, " ")}
                </Badge>
              </div>
              {alert.description && (
                <p className="text-xs text-gray-600 mt-0.5">
                  {alert.description}
                </p>
              )}
              {alert.property && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {alert.property.address}, {alert.property.city || ""},{" "}
                  {alert.property.state || ""}
                </p>
              )}
              <p className="text-[10px] text-gray-400 mt-1">
                {new Date(alert.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {!alert.read && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onMarkRead([alert.id])}
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
