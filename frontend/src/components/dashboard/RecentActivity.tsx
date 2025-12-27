import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: number;
  user: string;
  action: string;
  time: Date;
  type: "enrollment" | "subject" | "student" | "teacher";
}

// Mock data - replace with real data from API
const mockActivities: ActivityItem[] = [
  { id: 1, user: "John Doe", action: "enrolled in Mathematics", time: new Date(Date.now() - 1000 * 60 * 5), type: "enrollment" },
  { id: 2, user: "Jane Smith", action: "created new subject Physics", time: new Date(Date.now() - 1000 * 60 * 15), type: "subject" },
  { id: 3, user: "Admin", action: "added new student Mike Johnson", time: new Date(Date.now() - 1000 * 60 * 30), type: "student" },
];

export default function RecentActivity() {
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl text-gray-600">Recent Activity</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {mockActivities.map((activity, index) => (
            <div
              key={activity.id}
              className="flex items-start gap-4 bg-white rounded-lg p-4 w-full shadow-sm sm:shadow-md transition-shadow duration-200"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback
                  className={`text-white text-xs ${
                    index % 2 === 0 ? "bg-saBlue" : "bg-saVividOrange"
                  }`}
                >
                  {getInitials(activity.user)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium">{activity.user}</span>{" "}
                  <span className="text-muted-foreground">{activity.action}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(activity.time, { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
