package com.ecommerce.inventory.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Supplier entity representing product suppliers with contact information and status management
 */
@Entity
@Table(name = "suppliers", indexes = {
    @Index(name = "idx_suppliers_name", columnList = "name"),
    @Index(name = "idx_suppliers_email", columnList = "email"),
    @Index(name = "idx_suppliers_status", columnList = "status")
})
public class Supplier extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Supplier name is required")
    @Size(max = 200, message = "Supplier name must not exceed 200 characters")
    @Column(nullable = false)
    private String name;

    @Size(max = 100, message = "Contact person name must not exceed 100 characters")
    @Column(name = "contact_person")
    private String contactPerson;

    @Email(message = "Email should be valid")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    @Column
    private String email;

    @Size(max = 20, message = "Phone number must not exceed 20 characters")
    @Column
    private String phone;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Size(max = 100, message = "Payment terms must not exceed 100 characters")
    @Column(name = "payment_terms")
    private String paymentTerms;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SupplierStatus status = SupplierStatus.ACTIVE;

    // Relationships
    @OneToMany(mappedBy = "supplier", fetch = FetchType.LAZY)
    private List<Product> products = new ArrayList<>();

    // Constructors
    public Supplier() {}

    public Supplier(String name, String contactPerson, String email) {
        this.name = name;
        this.contactPerson = contactPerson;
        this.email = email;
        this.status = SupplierStatus.ACTIVE;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getContactPerson() {
        return contactPerson;
    }

    public void setContactPerson(String contactPerson) {
        this.contactPerson = contactPerson;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getPaymentTerms() {
        return paymentTerms;
    }

    public void setPaymentTerms(String paymentTerms) {
        this.paymentTerms = paymentTerms;
    }

    public SupplierStatus getStatus() {
        return status;
    }

    public void setStatus(SupplierStatus status) {
        this.status = status;
    }

    public List<Product> getProducts() {
        return products;
    }

    public void setProducts(List<Product> products) {
        this.products = products;
    }

    // Business methods

    /**
     * Check if supplier is active
     */
    public boolean isActive() {
        return status == SupplierStatus.ACTIVE;
    }

    /**
     * Check if supplier is inactive
     */
    public boolean isInactive() {
        return status == SupplierStatus.INACTIVE;
    }

    /**
     * Check if supplier is suspended
     */
    public boolean isSuspended() {
        return status == SupplierStatus.SUSPENDED;
    }

    /**
     * Activate the supplier
     */
    public void activate() {
        this.status = SupplierStatus.ACTIVE;
    }

    /**
     * Deactivate the supplier
     */
    public void deactivate() {
        this.status = SupplierStatus.INACTIVE;
    }

    /**
     * Suspend the supplier
     */
    public void suspend() {
        this.status = SupplierStatus.SUSPENDED;
    }

    /**
     * Get count of active products from this supplier
     */
    public long getActiveProductCount() {
        return products.stream()
                      .filter(product -> product.getActive())
                      .count();
    }

    /**
     * Get count of all products from this supplier
     */
    public long getTotalProductCount() {
        return products.size();
    }

    /**
     * Check if supplier can be deleted (no associated products)
     */
    public boolean canBeDeleted() {
        return products.isEmpty();
    }

    /**
     * Get primary contact information as formatted string
     */
    public String getPrimaryContact() {
        StringBuilder contact = new StringBuilder();
        
        if (contactPerson != null && !contactPerson.trim().isEmpty()) {
            contact.append(contactPerson);
        }
        
        if (email != null && !email.trim().isEmpty()) {
            if (contact.length() > 0) {
                contact.append(" - ");
            }
            contact.append(email);
        }
        
        if (phone != null && !phone.trim().isEmpty()) {
            if (contact.length() > 0) {
                contact.append(" - ");
            }
            contact.append(phone);
        }
        
        return contact.toString();
    }

    /**
     * Check if supplier has complete contact information
     */
    public boolean hasCompleteContactInfo() {
        return contactPerson != null && !contactPerson.trim().isEmpty() &&
               email != null && !email.trim().isEmpty() &&
               phone != null && !phone.trim().isEmpty();
    }

    /**
     * Update contact information
     */
    public void updateContactInfo(String contactPerson, String email, String phone, String address) {
        this.contactPerson = contactPerson;
        this.email = email;
        this.phone = phone;
        this.address = address;
    }

    /**
     * Update payment terms
     */
    public void updatePaymentTerms(String paymentTerms) {
        this.paymentTerms = paymentTerms;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Supplier supplier = (Supplier) o;
        return Objects.equals(id, supplier.id) && Objects.equals(name, supplier.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name);
    }

    @Override
    public String toString() {
        return "Supplier{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", contactPerson='" + contactPerson + '\'' +
                ", email='" + email + '\'' +
                ", status=" + status +
                '}';
    }


}