/**
 * Employee Data Transfer Objects (DTOs)
 * Handle data transformation between layers
 */

/**
 * Transform database employee to response DTO
 * @param {Object} employee - Database employee object
 * @returns {Object} - Response DTO
 */
export class EmployeeResponseDTO {
  constructor(employee) {
    this.id = employee._id ? employee._id.toString() : employee.id;
    this.name = employee.name;
    this.role = employee.role;
    this.department = employee.department;
    this.email = employee.email;
    this.phone = employee.phone;
    this.joiningDate = employee.joiningDate;
    this.employmentType = employee.employmentType;
    this.createdAt = employee.createdAt;
    this.updatedAt = employee.updatedAt;

    // Previous-experience details are only exposed for experienced employees so
    // the client never renders stale or irrelevant fields for a fresher.
    if (employee.employmentType === 'Experienced') {
      this.yearsOfExperience = employee.yearsOfExperience;
      this.previousOrganization = employee.previousOrganization;
      this.previousRole = employee.previousRole;
      this.previousExperienceDescription = employee.previousExperienceDescription;
    }
  }

  /**
   * Transform single employee
   */
  static fromModel(employee) {
    if (!employee) return null;
    return new EmployeeResponseDTO(employee);
  }

  /**
   * Transform array of employees
   */
  static fromModelArray(employees) {
    return employees.map((emp) => new EmployeeResponseDTO(emp));
  }
}

/**
 * Create Employee Request DTO
 * Sanitizes and validates input data
 */
export class CreateEmployeeDTO {
  constructor(data) {
    this.name = data.name?.trim();
    this.role = data.role?.trim();
    this.department = data.department?.trim();
    this.email = data.email?.trim().toLowerCase();
    this.phone = data.phone?.trim();
    this.joiningDate = data.joiningDate;
    this.employmentType = data.employmentType?.trim();

    // Only carry previous-experience data for experienced hires. For a fresher
    // the fields are simply omitted rather than stored as empty strings.
    if (this.employmentType === 'Experienced') {
      this.yearsOfExperience = Number(data.yearsOfExperience);
      this.previousOrganization = data.previousOrganization?.trim();
      this.previousRole = data.previousRole?.trim();
      this.previousExperienceDescription = data.previousExperienceDescription?.trim();
    }
  }

  static fromRequest(body) {
    return new CreateEmployeeDTO(body);
  }
}

/**
 * Update Employee Request DTO
 */
export class UpdateEmployeeDTO {
  constructor(data) {
    if (data.name !== undefined) this.name = data.name.trim();
    if (data.role !== undefined) this.role = data.role.trim();
    if (data.department !== undefined) this.department = data.department.trim();
    if (data.email !== undefined) this.email = data.email.trim().toLowerCase();
    if (data.phone !== undefined) this.phone = data.phone.trim();
    if (data.joiningDate !== undefined) this.joiningDate = data.joiningDate;
    if (data.employmentType !== undefined) {
      this.employmentType = data.employmentType.trim();
    }

    // Experience details are only applied when the employee is (or is becoming)
    // experienced. Switching to 'Fresher' is handled by the service, which
    // removes the stale fields instead of setting them.
    if (this.employmentType === 'Experienced') {
      if (data.yearsOfExperience !== undefined) {
        this.yearsOfExperience = Number(data.yearsOfExperience);
      }
      if (data.previousOrganization !== undefined) {
        this.previousOrganization = data.previousOrganization.trim();
      }
      if (data.previousRole !== undefined) {
        this.previousRole = data.previousRole.trim();
      }
      if (data.previousExperienceDescription !== undefined) {
        this.previousExperienceDescription = data.previousExperienceDescription.trim();
      }
    }
  }

  static fromRequest(body) {
    return new UpdateEmployeeDTO(body);
  }
}
