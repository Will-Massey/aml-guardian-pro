import { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { getClients } from '../services/clients';
import { getDocuments } from '../services/documents';

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { data: clientsData } = useQuery('clients', () => getClients());
  const { data: documentsData } = useQuery('documents', () => getDocuments());

  const clients = clientsData?.data || [];
  const documents = documentsData?.data || [];

  // Get calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get events for calendar
  const getEventsForDay = (date: Date) => {
    const events: { type: string; title: string; clientId?: string }[] = [];
    
    // CDD Reviews
    clients.forEach(client => {
      if (client.nextReviewDate) {
        const reviewDate = new Date(client.nextReviewDate);
        if (format(reviewDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')) {
          events.push({
            type: 'review',
            title: `${client.companyName} - CDD Review`,
            clientId: client.id,
          });
        }
      }
    });

    // Document expiries (simulated as created + 1 year)
    documents.forEach(doc => {
      const expiryDate = new Date(doc.createdAt);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      if (format(expiryDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')) {
        events.push({
          type: 'expiry',
          title: `${doc.name} expires`,
        });
      }
    });

    return events;
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Calendar</h1>
          <p className="text-gray-600 mt-1">
            Track CDD reviews, document expiries, and compliance milestones
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={prevMonth}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center space-x-6 bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
          <span className="text-sm text-gray-600">CDD Review Due</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-orange-500 rounded-full mr-2" />
          <span className="text-sm text-gray-600">Document Expiry</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
          <span className="text-sm text-gray-600">Completed</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="px-4 py-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const events = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);

            return (
              <div
                key={idx}
                className={`min-h-[120px] border-b border-r border-gray-200 p-2 ${
                  !isCurrentMonth ? 'bg-gray-50' : ''
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isTodayDate ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center' : 'text-gray-700'
                }`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {events.map((event, eventIdx) => (
                    <div
                      key={eventIdx}
                      className={`text-xs px-2 py-1 rounded truncate ${
                        event.type === 'review'
                          ? 'bg-blue-100 text-blue-800'
                          : event.type === 'expiry'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Events List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {clients
            .filter(c => c.nextReviewDate && new Date(c.nextReviewDate) >= new Date())
            .sort((a, b) => new Date(a.nextReviewDate!).getTime() - new Date(b.nextReviewDate!).getTime())
            .slice(0, 10)
            .map(client => (
              <div key={client.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{client.companyName}</p>
                    <p className="text-sm text-gray-500">CDD Review Due</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(client.nextReviewDate!).toLocaleDateString('en-GB')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {Math.ceil((new Date(client.nextReviewDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
