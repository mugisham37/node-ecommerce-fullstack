package com.ecommerce.inventory.dto.mapper;

import com.ecommerce.inventory.dto.request.UserCreateRequest;
import com.ecommerce.inventory.dto.request.UserUpdateRequest;
import com.ecommerce.inventory.dto.response.UserResponse;
import com.ecommerce.inventory.entity.User;
import org.mapstruct.*;

import java.util.List;

/**
 * MapStruct mapper for User entity and DTOs
 */
@Mapper(
    componentModel = "spring",
    unmappedTargetPolicy = ReportingPolicy.IGNORE,
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface UserMapper {

    @Mapping(target = "fullName", expression = "java(user.getFullName())")
    @Mapping(target = "passwordHash", ignore = true)
    UserResponse toResponse(User user);

    List<UserResponse> toResponseList(List<User> users);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "lastLogin", ignore = true)
    @Mapping(target = "failedLoginAttempts", ignore = true)
    @Mapping(target = "accountLockedUntil", ignore = true)
    @Mapping(target = "active", constant = "true")
    User toEntity(UserCreateRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "lastLogin", ignore = true)
    @Mapping(target = "failedLoginAttempts", ignore = true)
    @Mapping(target = "accountLockedUntil", ignore = true)
    void updateEntity(UserUpdateRequest request, @MappingTarget User user);

    @Named("toUserSummary")
    @Mapping(target = "fullName", expression = "java(user.getFullName())")
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "lastLogin", ignore = true)
    @Mapping(target = "failedLoginAttempts", ignore = true)
    @Mapping(target = "accountLockedUntil", ignore = true)
    UserResponse toSummaryResponse(User user);
}