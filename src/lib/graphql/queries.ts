// ═══════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════

export const GET_USER_BY_EMAIL = `
  query GetUserByEmail($email: String!) {
    users(where: { email: { _eq: $email } }, limit: 1) {
      id
      email
      name
      password
      role
      isActive
    }
  }
`;

// ═══════════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════

export const ADMIN_STATS = `
  query AdminStats {
    totalInterns: interns_aggregate { aggregate { count } }
    activeInterns: interns_aggregate(where: { status: { _eq: "ACTIVE" } }) { aggregate { count } }
    totalManagers: managers_aggregate { aggregate { count } }
    totalDepartments: departments_aggregate { aggregate { count } }
    totalDocTypes: document_types_aggregate { aggregate { count } }
    pendingDocs: documents_aggregate(where: { status: { _eq: "PENDING" } }) { aggregate { count } }
    recentInterns: users(where: { role: { _eq: "INTERN" } }, order_by: { createdAt: desc }, limit: 5) {
      id
      name
      email
      createdAt
      interns {
        department { name }
        manager { user { name } }
      }
    }
  }
`;

// ═══════════════════════════════════════════════
// MANAGER DASHBOARD
// ═══════════════════════════════════════════════

export const MANAGER_DASHBOARD = `
  query ManagerDashboard($userId: String!) {
    managers(where: { userId: { _eq: $userId } }, limit: 1) {
      id
      department { name }
      interns(order_by: { createdAt: desc }) {
        id
        status
        startDate
        user {
          name
          email
          isActive
        }
      }
    }
    pendingDocs: documents_aggregate(where: {
      status: { _eq: "PENDING" },
      user: { interns: { manager: { userId: { _eq: $userId } } } }
    }) { aggregate { count } }
  }
`;

// ═══════════════════════════════════════════════
// INTERN DASHBOARD
// ═══════════════════════════════════════════════

export const INTERN_DASHBOARD = `
  query InternDashboard($userId: String!) {
    interns(where: { userId: { _eq: $userId } }, limit: 1) {
      id
      internId
      status
      startDate
      endDate
      university
      department { name }
      manager { user { name email } }
    }
    document_types(where: { isActive: { _eq: true } }, order_by: [{ isRequired: desc }, { name: asc }]) {
      id
      name
      isRequired
    }
    documents(where: { userId: { _eq: $userId } }) {
      id
      documentTypeId
      status
      document_type {
        id
        name
        isRequired
      }
    }
  }
`;

// ═══════════════════════════════════════════════
// DEPARTMENTS
// ═══════════════════════════════════════════════

export const GET_DEPARTMENTS = `
  query GetDepartments {
    departments(order_by: { name: asc }) {
      id
      name
      description
      isActive
      managerId
      manager: user { id name email }
      interns_aggregate { aggregate { count } }
      managers_aggregate { aggregate { count } }
    }
  }
`;

export const GET_DEPARTMENT = `
  query GetDepartment($id: String!) {
    departments_by_pk(id: $id) {
      id
      name
      description
      isActive
      managerId
      manager: user { id name email }
      interns {
        id
        userId
        user { name email }
      }
      managers {
        id
        userId
        user { name email }
      }
    }
  }
`;

export const CHECK_DEPARTMENT = `
  query CheckDepartment($name: String!) {
    departments(where: { name: { _eq: $name } }, limit: 1) { id }
  }
`;

export const CREATE_DEPARTMENT = `
  mutation CreateDepartment($object: departments_insert_input!) {
    insert_departments_one(object: $object) {
      id
      name
      description
      isActive
      createdAt
    }
  }
`;

export const UPDATE_DEPARTMENT = `
  mutation UpdateDepartment($id: String!, $set: departments_set_input!) {
    update_departments_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
      name
      description
      isActive
    }
  }
`;

export const DEACTIVATE_DEPARTMENT = `
  mutation DeactivateDepartment($id: String!) {
    update_departments_by_pk(pk_columns: { id: $id }, _set: { isActive: false }) { id }
  }
`;

export const SET_DEPARTMENT_MANAGER = `
  mutation SetDepartmentManager($deptId: String!, $userId: String!) {
    update_departments_by_pk(pk_columns: { id: $deptId }, _set: { managerId: $userId }) { id }
  }
`;

export const CLEAR_DEPARTMENT_MANAGER = `
  mutation ClearDepartmentManager($userId: String!) {
    update_departments(where: { managerId: { _eq: $userId } }, _set: { managerId: null }) { affected_rows }
  }
`;

export const GET_DEPT_NAME = `
  query GetDeptName($id: String!) {
    departments_by_pk(id: $id) { name }
  }
`;

// ═══════════════════════════════════════════════
// MANAGERS
// ═══════════════════════════════════════════════

export const GET_MANAGERS = `
  query GetManagers($where: managers_bool_exp!) {
    managers(where: $where, order_by: { createdAt: desc }) {
      id
      userId
      designation
      departmentId
      user {
        id
        name
        email
        phone
        isActive
        createdAt
      }
      department { id name }
      interns_aggregate { aggregate { count } }
    }
  }
`;

export const GET_MANAGER = `
  query GetManager($id: String!) {
    managers_by_pk(id: $id) {
      id
      userId
      designation
      departmentId
      user { id name email phone isActive }
      department { id name description }
      interns {
        id
        userId
        user { name email }
      }
    }
  }
`;

export const GET_MANAGER_BASIC = `
  query GetManagerBasic($id: String!) {
    managers_by_pk(id: $id) { id userId departmentId }
  }
`;

export const GET_MANAGER_UPDATED = `
  query GetManagerUpdated($id: String!) {
    managers_by_pk(id: $id) {
      id
      userId
      designation
      departmentId
      user { id name email phone }
    }
  }
`;

export const GET_MANAGER_USER_ID = `
  query GetManagerUserId($id: String!) {
    managers_by_pk(id: $id) { userId }
  }
`;

export const GET_MANAGER_BY_USER_ID = `
  query GetManagerByUserId($userId: String!) {
    managers(where: { userId: { _eq: $userId } }, limit: 1) { id }
  }
`;

export const GET_MANAGER_BY_USER_ID_WITH_DEPT = `
  query GetManagerByUserId($userId: String!) {
    managers(where: { userId: { _eq: $userId } }, limit: 1) { id departmentId }
  }
`;

export const CREATE_MANAGER = `
  mutation CreateManager($object: managers_insert_input!) {
    insert_managers_one(object: $object) { id userId designation departmentId }
  }
`;

export const UPDATE_MANAGER_PROFILE = `
  mutation UpdateManagerProfile($id: String!, $set: managers_set_input!) {
    update_managers_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;

export const UPDATE_MANAGER_DEPT = `
  mutation UpdateManagerDept($id: String!, $deptId: String!) {
    update_managers_by_pk(pk_columns: { id: $id }, _set: { departmentId: $deptId }) { id }
  }
`;

// ═══════════════════════════════════════════════
// USERS (shared)
// ═══════════════════════════════════════════════

export const CHECK_EMAIL = `
  query CheckEmail($email: String!) {
    users(where: { email: { _eq: $email } }, limit: 1) { id }
  }
`;

export const CREATE_USER = `
  mutation CreateUser($object: users_insert_input!) {
    insert_users_one(object: $object) { id email name phone role }
  }
`;

export const UPDATE_USER = `
  mutation UpdateUser($id: String!, $set: users_set_input!) {
    update_users_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;

export const DEACTIVATE_USER = `
  mutation DeactivateUser($id: String!) {
    update_users_by_pk(pk_columns: { id: $id }, _set: { isActive: false }) { id }
  }
`;

// ═══════════════════════════════════════════════
// INTERNS
// ═══════════════════════════════════════════════

export const GET_INTERNS = `
  query GetInterns($where: interns_bool_exp!, $limit: Int!, $offset: Int!) {
    interns_aggregate(where: $where) { aggregate { count } }
    interns(where: $where, limit: $limit, offset: $offset, order_by: { createdAt: desc }) {
      id
      userId
      managerId
      departmentId
      internId
      university
      course
      status
      user { id name email phone isActive createdAt }
      department { id name }
      manager { id user { name email } }
    }
  }
`;

export const GET_INTERN = `
  query GetIntern($id: String!) {
    interns_by_pk(id: $id) {
      id
      userId
      internId
      university
      course
      yearOfStudy
      address
      startDate
      endDate
      status
      managerId
      departmentId
      user { id name email phone isActive createdAt }
      department { id name description }
      manager { id user { name email } }
    }
  }
`;

export const GET_INTERN_BASIC = `
  query GetInternBasic($id: String!) {
    interns_by_pk(id: $id) { id userId user { email } }
  }
`;

export const GET_INTERN_UPDATED = `
  query GetInternUpdated($id: String!) {
    interns_by_pk(id: $id) {
      id
      userId
      status
      departmentId
      managerId
    }
  }
`;

export const GET_INTERN_USER_ID = `
  query GetInternUserId($id: String!) {
    interns_by_pk(id: $id) { userId }
  }
`;

export const INTERN_COUNT = `
  query InternCount {
    interns_aggregate { aggregate { count } }
  }
`;

export const CREATE_INTERN = `
  mutation CreateIntern($object: interns_insert_input!) {
    insert_interns_one(object: $object) {
      id
      internId
      departmentId
      managerId
    }
  }
`;

export const UPDATE_INTERN = `
  mutation UpdateIntern($id: String!, $set: interns_set_input!) {
    update_interns_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;

export const GET_MGR_NAME = `
  query GetMgrName($id: String!) {
    managers_by_pk(id: $id) { user { name } }
  }
`;

// ═══════════════════════════════════════════════
// DOCUMENT TYPES
// ═══════════════════════════════════════════════

export const GET_DOCUMENT_TYPES = `
  query GetDocumentTypes {
    document_types(
      where: { isActive: { _eq: true } }
      order_by: [{ isRequired: desc }, { name: asc }]
    ) {
      id
      name
      description
      isRequired
      isActive
      acceptedFormats
      maxSizeMb
      documents_aggregate { aggregate { count } }
    }
  }
`;

export const CHECK_DOC_TYPE = `
  query CheckDocType($name: String!) {
    document_types(where: { name: { _eq: $name } }, limit: 1) { id }
  }
`;

export const CREATE_DOCUMENT_TYPE = `
  mutation CreateDocumentType($object: document_types_insert_input!) {
    insert_document_types_one(object: $object) {
      id name description isRequired isActive acceptedFormats maxSizeMb
    }
  }
`;

export const UPDATE_DOCUMENT_TYPE = `
  mutation UpdateDocumentType($id: String!, $set: document_types_set_input!) {
    update_document_types_by_pk(pk_columns: { id: $id }, _set: $set) {
      id name description isRequired isActive acceptedFormats maxSizeMb
    }
  }
`;

export const DEACTIVATE_DOC_TYPE = `
  mutation DeactivateDocType($id: String!) {
    update_document_types_by_pk(pk_columns: { id: $id }, _set: { isActive: false }) { id }
  }
`;

// ═══════════════════════════════════════════════
// DOCUMENTS
// ═══════════════════════════════════════════════

export const GET_DOCUMENTS = `
  query GetDocuments($where: documents_bool_exp!) {
    documents(where: $where, order_by: { createdAt: desc }) {
      id
      userId
      documentTypeId
      fileName
      originalName
      fileUrl
      filePath
      fileSize
      mimeType
      status
      rejectionReason
      reviewedAt
      reviewedBy
      createdAt
      user { id name email }
      document_type { id name isRequired }
    }
  }
`;

export const GET_DOC_TYPE_BY_PK = `
  query GetDocType($id: String!) {
    document_types_by_pk(id: $id) { id name isRequired acceptedFormats }
  }
`;

export const FIND_EXISTING_DOC = `
  query FindExistingDoc($userId: String!, $docTypeId: String!) {
    documents(
      where: { userId: { _eq: $userId }, documentTypeId: { _eq: $docTypeId }, status: { _eq: "PENDING" } }
      limit: 1
    ) {
      id
      filePath
    }
  }
`;

export const DELETE_DOC = `
  mutation DeleteDoc($id: String!) {
    delete_documents_by_pk(id: $id) { id }
  }
`;

export const INSERT_DOCUMENT = `
  mutation InsertDocument($object: documents_insert_input!) {
    insert_documents_one(object: $object) {
      id
      userId
      documentTypeId
      fileName
      originalName
      fileUrl
      filePath
      fileSize
      mimeType
      status
      createdAt
      document_type { id name }
    }
  }
`;

export const REVIEW_DOCUMENT = `
  mutation ReviewDocument($id: String!, $set: documents_set_input!) {
    update_documents_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
      status
      rejectionReason
      reviewedAt
      reviewedBy
      document_type { id name }
      user { name email }
    }
  }
`;

export const GET_DOC_FOR_DELETE = `
  query GetDoc($id: String!) {
    documents_by_pk(id: $id) { id userId filePath }
  }
`;

// ═══════════════════════════════════════════════
// ASSIGNMENTS
// ═══════════════════════════════════════════════

export const CLEAR_OLD_MANAGER_ASSIGNMENT = `
  mutation ClearOldManagerAssignment($userId: String!) {
    update_departments(where: { managerId: { _eq: $userId } }, _set: { managerId: null }) { affected_rows }
  }
`;

export const ASSIGN_MANAGER_TO_DEPT = `
  mutation AssignManagerToDept($deptId: String!, $userId: String!) {
    update_departments_by_pk(pk_columns: { id: $deptId }, _set: { managerId: $userId }) { id name }
  }
`;

export const ASSIGN_INTERN_TO_MANAGER = `
  mutation AssignInternToManager($id: String!, $managerId: String!, $deptId: String) {
    update_interns_by_pk(
      pk_columns: { id: $id }
      _set: { managerId: $managerId, departmentId: $deptId }
    ) { id managerId departmentId }
  }
`;

// ═══════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════

export const GET_PROFILE = `
  query GetProfile($userId: String!) {
    users_by_pk(id: $userId) {
      id name email phone
      role
      isActive
      createdAt
      interns {
        id
        internId
        university
        course
        yearOfStudy
        address
        startDate
        endDate
        status
        departmentId
        managerId
        department { id name }
        manager { id user { id name email } }
      }
      managers {
        id
        designation
        departmentId
        department { id name }
        interns { id user { name email } }
      }
      documents(order_by: { createdAt: desc }) {
        id
        documentTypeId
        fileName
        originalName
        fileUrl
        filePath
        fileSize
        mimeType
        status
        rejectionReason
        createdAt
        document_type { id name isRequired }
      }
    }
    document_types(where: { isActive: { _eq: true }, isRequired: { _eq: true } }) {
      id
    }
  }
`;
