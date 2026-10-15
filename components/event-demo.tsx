// components/event-demo.tsx

import { EventCard } from "@/components/ui/card-14";

export default function EventCardDemo() {
  const eventDate = new Date("2025-03-11T10:30:00");

  const handleMarkEvent = () => {
    console.log("Event action clicked!");
    alert("Event marked!");
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-10 font-sans">
      <EventCard
        heading="Scheduling"
        description="You have one scheduled event today – don't miss it!"
        date={eventDate}
        imageUrl="https://cdn.21st.dev/assets/mirror/47/47e6f6ee552ab6d1919c5b3249c4976790152f17123f38fd36bce867112d01c1.jpg"
        imageAlt="Lush lavender fields under a clear sky with a single tree."
        eventName="Expo World Press Photo Montreal"
        location="325 Rue de la Commune E"
        time="10:30 AM"
        actionLabel="Mark this event"
        onActionClick={handleMarkEvent}
      />
    </div>
  );
}
