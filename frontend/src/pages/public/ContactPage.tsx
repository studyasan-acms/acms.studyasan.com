import { useState } from 'react';
import {
    Phone,
    Mail,
    MapPin,
    Clock,
    Send,
    MessageCircle,
    Headphones,
    CheckCircle
} from 'lucide-react';

const contactInfo = [
    {
        icon: Phone,
        title: 'Phone',
        details: ['+91 7983758633'],
        link: 'tel:+917983758633',
        color: 'from-green-500 to-emerald-500',
    },
    {
        icon: Mail,
        title: 'Email',
        details: ['studyasaneducation@gmail.com', 'info@studyasan.com'],
        link: 'mailto:studyasaneducation@gmail.com',
        color: 'from-blue-500 to-cyan-500',
    },
    {
        icon: MapPin,
        title: 'Location',
        details: ['Nainital, Uttarakhand', 'India'],
        link: '#',
        color: 'from-red-500 to-pink-500',
    },
    {
        icon: Clock,
        title: 'Working Hours',
        details: ['Monday - Saturday', '10:00 AM - 7:00 PM'],
        link: '#',
        color: 'from-purple-500 to-violet-500',
    },
];

const faqs = [
    {
        question: 'What courses do you offer?',
        answer: 'We offer tuition for Kids, Grade 4-12, NET/JRF preparation, competitive exams (SSC, Bank, Railway, UPSC), and computer courses.',
    },
    {
        question: 'Do you provide online classes?',
        answer: 'Yes, we provide both online and offline classes. Students can choose their preferred mode of learning.',
    },
    {
        question: 'What is the fee structure?',
        answer: 'Fee varies based on the course and mode of teaching. Please contact us for detailed information.',
    },
    {
        question: 'How can I enroll?',
        answer: 'You can enroll by clicking the Sign Up button or contacting us through phone or email.',
    },
];

import { usePageTitle } from "@/hooks/usePageTitle";

export default function ContactPage() {
    usePageTitle("Contact Us");
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate form submission
        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsSubmitting(false);
        setIsSubmitted(true);
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });

        // Reset success message after 5 seconds
        setTimeout(() => setIsSubmitted(false), 5000);
    };

    return (
        <div>
            {/* Hero Section */}
            <section className="relative py-24 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
                </div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-3xl mx-auto text-center text-white">
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">Contact Us</h1>
                        <p className="text-xl text-blue-100 leading-relaxed">
                            StudyAsan's here for support. We'd love to hear from you!
                        </p>
                    </div>
                </div>
            </section>

            {/* Contact Info Cards */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 -mt-24 relative z-20">
                        {contactInfo.map((info, index) => (
                            <a
                                key={index}
                                href={info.link}
                                className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow group"
                            >
                                <div className={`w-14 h-14 bg-gradient-to-br ${info.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <info.icon className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{info.title}</h3>
                                {info.details.map((detail, i) => (
                                    <p key={i} className="text-gray-600">{detail}</p>
                                ))}
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Form & Info Section */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-16">
                        {/* Contact Form */}
                        <div>
                            <span className="inline-block px-4 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium mb-4">
                                Send us a Message
                            </span>
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                                How Can We Help?
                            </h2>
                            <p className="text-gray-600 mb-8">
                                Fill out the form below and we'll get back to you as soon as possible.
                            </p>

                            {isSubmitted ? (
                                <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-green-800 mb-2">Thank You!</h3>
                                    <p className="text-green-600">
                                        Your message has been sent successfully. We'll get back to you soon!
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                                Full Name *
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                                placeholder="Your name"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                                Email Address *
                                            </label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                                placeholder="your@email.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                                                Phone Number
                                            </label>
                                            <input
                                                type="tel"
                                                id="phone"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                                placeholder="+91 XXXXX XXXXX"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                                                Subject *
                                            </label>
                                            <select
                                                id="subject"
                                                name="subject"
                                                value={formData.subject}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                            >
                                                <option value="">Select a subject</option>
                                                <option value="admission">Admission Inquiry</option>
                                                <option value="courses">Course Information</option>
                                                <option value="fees">Fee Structure</option>
                                                <option value="career">Career Opportunities</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                                            Message *
                                        </label>
                                        <textarea
                                            id="message"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            required
                                            rows={5}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
                                            placeholder="How can we help you?"
                                        ></textarea>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5" />
                                                Send Message
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Support Info */}
                        <div>
                            <span className="inline-block px-4 py-1 bg-purple-100 text-purple-600 rounded-full text-sm font-medium mb-4">
                                Support
                            </span>
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                                We're Here to Help
                            </h2>
                            <p className="text-gray-600 mb-8 leading-relaxed">
                                StudyAsan - The Path to Success provides online support through email and other contact
                                services and offline support only for subjects, mode of teaching, medium of teaching
                                and fee structure.
                            </p>

                            {/* Support Cards */}
                            <div className="space-y-4 mb-8">
                                <div className="bg-white rounded-2xl p-6 shadow-lg flex items-start gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <MessageCircle className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 mb-1">Chat Support</h4>
                                        <p className="text-gray-600 text-sm">
                                            Get instant answers to your queries through our website chat.
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl p-6 shadow-lg flex items-start gap-4">
                                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Headphones className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 mb-1">Phone Support</h4>
                                        <p className="text-gray-600 text-sm">
                                            Call us during working hours for immediate assistance.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* FAQ Section */}
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h3>
                            <div className="space-y-4">
                                {faqs.map((faq, index) => (
                                    <details key={index} className="bg-white rounded-xl shadow group">
                                        <summary className="px-6 py-4 cursor-pointer font-medium text-gray-900 flex items-center justify-between">
                                            {faq.question}
                                            <span className="text-blue-600 group-open:rotate-180 transition-transform">
                                                ▼
                                            </span>
                                        </summary>
                                        <p className="px-6 pb-4 text-gray-600">{faq.answer}</p>
                                    </details>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Map Section */}
            <section className="h-96 bg-gray-200 relative">
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-900/90 to-blue-800/90">
                    <div className="text-center text-white">
                        <MapPin className="w-16 h-16 mx-auto mb-4 animate-bounce" />
                        <h3 className="text-2xl font-bold mb-2">Visit Us</h3>
                        <p className="text-blue-100">Nainital, Uttarakhand, India</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
