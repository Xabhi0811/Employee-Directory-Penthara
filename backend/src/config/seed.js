import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Employee from '../models/Employee.js';

// Load environment variables
dotenv.config();

/**
 * Sample employee data for seeding the database.
 *
 * Roles come from the canonical role list and departments from the canonical
 * department list (see shared/constants/validation.constants.js). Role and
 * department are deliberately independent values - a role is a job title, a
 * department is the organisational unit.
 */
const sampleEmployees = [
  // --- Engineering ---
  {
    name: 'Michael Chen',
    role: 'Solution Architect',
    department: 'Engineering',
    email: 'michael.chen@company.com',
    phone: '+1 (555) 100-0002',
    joiningDate: new Date('2021-03-20'),
    employmentType: 'Experienced',
    yearsOfExperience: 11,
    previousOrganization: 'Northwind Systems',
    previousRole: 'Principal Engineer',
    previousExperienceDescription:
      'Designed distributed cloud platforms and led architecture reviews across multiple product teams.',
  },
  {
    name: 'Christopher Lee',
    role: 'React JS Developer',
    department: 'Engineering',
    email: 'christopher.lee@company.com',
    phone: '+1 (555) 100-0010',
    joiningDate: new Date('2023-01-10'),
    employmentType: 'Experienced',
    yearsOfExperience: 4,
    previousOrganization: 'ABC Technologies',
    previousRole: 'Frontend Developer',
    previousExperienceDescription:
      'Built and maintained large scale React single page applications with a focus on performance.',
  },
  {
    name: 'Robert Taylor',
    role: 'Azure Migration Engineer',
    department: 'Engineering',
    email: 'robert.taylor@company.com',
    phone: '+1 (555) 100-0006',
    joiningDate: new Date('2022-08-15'),
    employmentType: 'Experienced',
    yearsOfExperience: 7,
    previousOrganization: 'Cloudspan Consulting',
    previousRole: 'Cloud Infrastructure Engineer',
    previousExperienceDescription:
      'Migrated on premise workloads to Azure and automated infrastructure provisioning.',
  },
  {
    name: 'Priya Nair',
    role: 'Microsoft 365 Technical Lead',
    department: 'Engineering',
    email: 'priya.nair@company.com',
    phone: '+1 (555) 100-0016',
    joiningDate: new Date('2021-09-01'),
    employmentType: 'Experienced',
    yearsOfExperience: 9,
    previousOrganization: 'Globex IT Services',
    previousRole: 'Collaboration Consultant',
    previousExperienceDescription:
      'Led Microsoft 365 rollouts and governance for enterprise customers across three regions.',
  },
  {
    name: 'Daniel Wilson',
    role: 'SharePoint Developer',
    department: 'Engineering',
    email: 'daniel.wilson@company.com',
    phone: '+1 (555) 100-0012',
    joiningDate: new Date('2023-03-15'),
    employmentType: 'Experienced',
    yearsOfExperience: 3,
    previousOrganization: 'Bluepeak Solutions',
    previousRole: 'SharePoint Consultant',
    previousExperienceDescription:
      'Developed SharePoint intranet solutions and custom web parts for internal business teams.',
  },
  {
    name: 'Arjun Mehta',
    role: 'Software Development Intern',
    department: 'Engineering',
    email: 'arjun.mehta@company.com',
    phone: '+1 (555) 100-0017',
    joiningDate: new Date('2024-06-03'),
    employmentType: 'Fresher',
  },
  {
    name: 'Sofia Almeida',
    role: 'Microsoft 365 Developer Associate',
    department: 'Engineering',
    email: 'sofia.almeida@company.com',
    phone: '+1 (555) 100-0018',
    joiningDate: new Date('2024-02-12'),
    employmentType: 'Fresher',
  },

  // --- Digital Marketing ---
  {
    name: 'Amanda White',
    role: 'Digital Marketing Specialist',
    department: 'Digital Marketing',
    email: 'amanda.white@company.com',
    phone: '+1 (555) 100-0007',
    joiningDate: new Date('2021-01-05'),
    employmentType: 'Experienced',
    yearsOfExperience: 8,
    previousOrganization: 'Brightline Media',
    previousRole: 'Campaign Manager',
    previousExperienceDescription:
      'Planned and measured multi channel campaigns with a focus on paid search and lifecycle email.',
  },
  {
    name: 'Patricia Garcia',
    role: 'Content Writer (Contractual)',
    department: 'Digital Marketing',
    email: 'patricia.garcia@company.com',
    phone: '+1 (555) 100-0011',
    joiningDate: new Date('2022-09-05'),
    employmentType: 'Experienced',
    yearsOfExperience: 5,
    previousOrganization: 'Wordcraft Agency',
    previousRole: 'Senior Copywriter',
    previousExperienceDescription:
      'Produced long form technical content and editorial calendars for B2B software clients.',
  },
  {
    name: 'Kevin Osei',
    role: 'Digital Marketing Associate',
    department: 'Digital Marketing',
    email: 'kevin.osei@company.com',
    phone: '+1 (555) 100-0019',
    joiningDate: new Date('2023-11-14'),
    employmentType: 'Fresher',
  },
  {
    name: 'Chloe Dubois',
    role: 'Digital Marketing Intern',
    department: 'Digital Marketing',
    email: 'chloe.dubois@company.com',
    phone: '+1 (555) 100-0020',
    joiningDate: new Date('2024-07-01'),
    employmentType: 'Fresher',
  },

  // --- Human Resources ---
  {
    name: 'Jessica Martinez',
    role: 'Technical Project Manager',
    department: 'Human Resources',
    email: 'jessica.martinez@company.com',
    phone: '+1 (555) 100-0005',
    joiningDate: new Date('2020-05-12'),
    employmentType: 'Experienced',
    yearsOfExperience: 12,
    previousOrganization: 'Harborview Group',
    previousRole: 'People Operations Manager',
    previousExperienceDescription:
      'Ran hiring operations and onboarding programmes for fast growing engineering teams.',
  },
  {
    name: 'Tom Becker',
    role: 'Human Resource Intern',
    department: 'Human Resources',
    email: 'tom.becker@company.com',
    phone: '+1 (555) 100-0021',
    joiningDate: new Date('2024-08-19'),
    employmentType: 'Fresher',
  },

  // --- Sales ---
  {
    name: 'James Anderson',
    role: 'Commission Sales Executive (Remote – USA)',
    department: 'Sales',
    email: 'james.anderson@company.com',
    phone: '+1 (555) 100-0008',
    joiningDate: new Date('2020-11-20'),
    employmentType: 'Experienced',
    yearsOfExperience: 10,
    previousOrganization: 'Summit Sales Partners',
    previousRole: 'Regional Account Executive',
    previousExperienceDescription:
      'Owned a remote territory selling SaaS subscriptions and consistently exceeded quota.',
  },

  // --- Business Development ---
  {
    name: 'Lisa Thompson',
    role: 'Senior Business Development Executive',
    department: 'Business Development',
    email: 'lisa.thompson@company.com',
    phone: '+1 (555) 100-0009',
    joiningDate: new Date('2022-04-18'),
    employmentType: 'Experienced',
    yearsOfExperience: 6,
    previousOrganization: 'Vantage Advisory',
    previousRole: 'Partnerships Lead',
    previousExperienceDescription:
      'Built reseller partnerships and negotiated commercial agreements in new markets.',
  },
  {
    name: 'Matthew Davis',
    role: 'Business Analyst',
    department: 'Business Development',
    email: 'matthew.davis@company.com',
    phone: '+1 (555) 100-0014',
    joiningDate: new Date('2022-12-01'),
    employmentType: 'Experienced',
    yearsOfExperience: 5,
    previousOrganization: 'Datapoint Analytics',
    previousRole: 'Reporting Analyst',
    previousExperienceDescription:
      'Translated business requirements into reporting specifications and dashboards.',
  },
];

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

/**
 * Seed the database with sample data
 */
const seedDatabase = async () => {
  try {
    console.log('Starting database seed...');

    // Clear existing employees
    const deleteResult = await Employee.deleteMany({});
    console.log(`Cleared ${deleteResult.deletedCount} existing employees`);

    // Insert sample employees
    const employees = await Employee.insertMany(sampleEmployees);
    console.log(`Successfully seeded ${employees.length} employees`);

    // Display summary
    console.log('\n' + '='.repeat(50));
    console.log('Database Seed Summary');
    console.log('='.repeat(50));
    console.log(`Total Employees: ${employees.length}`);
    
    // Count by department
    const departments = {};
    employees.forEach((emp) => {
      departments[emp.department] = (departments[emp.department] || 0) + 1;
    });

    console.log('\nEmployees by Department:');
    Object.entries(departments)
      .sort(([, a], [, b]) => b - a)
      .forEach(([dept, count]) => {
        console.log(`  ${dept}: ${count}`);
      });

    console.log('\n' + '='.repeat(50));
    console.log('Seed completed successfully!');
    console.log('='.repeat(50) + '\n');
  } catch (error) {
    console.error('Error seeding database:', error.message);
    process.exit(1);
  }
};

/**
 * Main execution function
 */
const run = async () => {
  try {
    await connectDB();
    await seedDatabase();
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
};

// Run the seed script
run();
