import { QueueStatus } from "../../queue-status";

export const metadata = { title: "Queue – Counter: Your Turn" };

export default function Page() {
  return (
    <QueueStatus
      stage="counter"
      status="your-turn"
      customerName="MUHAMMAD SYAFIQ BIN MOHAMED NOOR"
      queueNumber="1001"
      location="Counter 6"
    />
  );
}
